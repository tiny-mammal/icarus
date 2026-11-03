/**
 * Encrypted diary format and key hierarchy.
 *
 * A random 256-bit master key encrypts everything (AES-256-GCM, fresh 96-bit
 * IV per write). The master key is stored only wrapped, twice:
 *  - by a key derived from the password with Argon2id (slow on purpose, so an
 *    offline guessing attack stays expensive);
 *  - by a key derived from a random 160-bit recovery key with HKDF (the
 *    recovery key is already high-entropy, so no stretching is needed).
 * Changing the password or the recovery key only rewraps the master key; the
 * diary and drafts never need re-encrypting.
 *
 * Each ciphertext is bound to its purpose through GCM additional data, so a
 * sealed draft list cannot be swapped in for the diary (or vice versa).
 */
import {
  fromBase32,
  fromBase64,
  randomBytes,
  toBase32,
  toBase64,
  utf8Decode,
  utf8Encode,
} from './encoding';

export const VAULT_FORMAT = 'icarus-encrypted-diary';
export const SEALED_FORMAT = 'icarus-sealed';
const VERSION = 1;

const IV_BYTES = 12;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const RECOVERY_BYTES = 20;

export interface Argon2Params {
  memoryKiB: number;
  iterations: number;
  parallelism: number;
}

/** OWASP's Argon2id baseline, raised to 64 MiB: ~0.5 s per unlock in a browser. */
export const DEFAULT_ARGON2: Argon2Params = {
  memoryKiB: 64 * 1024,
  iterations: 3,
  parallelism: 1,
};

/** Bounds accepted from a file, so a tampered header cannot hang the app. */
const MAX_ARGON2: Argon2Params = {
  memoryKiB: 1024 * 1024,
  iterations: 32,
  parallelism: 16,
};

interface Sealed {
  iv: string;
  data: string;
}

interface PasswordSlot extends Sealed {
  kdf: { name: 'argon2id'; salt: string } & Argon2Params;
}

interface RecoverySlot extends Sealed {
  kdf: { name: 'hkdf-sha256'; salt: string };
}

/** The public half of the key hierarchy, stored in the diary file. */
export interface Keyring {
  password: PasswordSlot;
  recovery: RecoverySlot;
}

export interface EncryptedVaultFile {
  format: typeof VAULT_FORMAT;
  version: typeof VERSION;
  keyring: Keyring;
  payload: Sealed;
}

/** A value from a key-value store (drafts, personal dictionary) at rest. */
export interface SealedValue extends Sealed {
  format: typeof SEALED_FORMAT;
  version: typeof VERSION;
}

/** An unlocked vault: the master key plus the keyring that protects it. */
export interface VaultKeys {
  readonly master: CryptoKey;
  readonly keyring: Keyring;
}

/** The password or recovery key did not open the keyring. */
export class WrongSecretError extends Error {
  constructor() {
    super('The password or recovery key is not correct');
    this.name = 'WrongSecretError';
  }
}

/** The encrypted data is malformed or failed authentication. */
export class CorruptVaultError extends Error {
  constructor(message = 'The encrypted diary is damaged or was modified') {
    super(message);
    this.name = 'CorruptVaultError';
  }
}

// --- availability ---------------------------------------------------------

/**
 * Web Crypto's `subtle` API only exists in secure contexts (HTTPS, localhost,
 * the desktop app). Over plain HTTP on a LAN the diary cannot be protected,
 * and an injected script could capture the password anyway.
 */
export function encryptionSupported(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle?.encrypt === 'function';
}

// --- primitives -----------------------------------------------------------

const aad = (purpose: string) => utf8Encode(`icarus/v${VERSION}/${purpose}`);

async function aesKey(raw: Uint8Array<ArrayBuffer>, extractable: boolean): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', extractable, ['encrypt', 'decrypt']);
}

async function seal(key: CryptoKey, purpose: string, plain: Uint8Array<ArrayBuffer>): Promise<Sealed> {
  const iv = randomBytes(IV_BYTES);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(purpose) },
    key,
    plain,
  );
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

/** Decrypt or throw `onFailure()` — GCM authentication failures look identical. */
async function open(
  key: CryptoKey,
  purpose: string,
  sealed: Sealed,
  onFailure: () => Error,
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(sealed.iv), additionalData: aad(purpose) },
      key,
      fromBase64(sealed.data),
    );
    return new Uint8Array(plain);
  } catch {
    throw onFailure();
  }
}

async function passwordKey(password: string, slot: PasswordSlot['kdf']): Promise<CryptoKey> {
  // Loaded on first use: unencrypted diaries never download the Argon2 WASM.
  const { argon2id } = await import('hash-wasm');
  const raw = await argon2id({
    password: password.normalize('NFC'),
    salt: fromBase64(slot.salt),
    memorySize: slot.memoryKiB,
    iterations: slot.iterations,
    parallelism: slot.parallelism,
    hashLength: KEY_BYTES,
    outputType: 'binary',
  });
  return aesKey(new Uint8Array(raw), false);
}

async function recoveryKeyFrom(secret: Uint8Array<ArrayBuffer>, salt: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: fromBase64(salt), info: aad('recovery') },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function masterBytes(keys: VaultKeys): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.exportKey('raw', keys.master));
}

async function passwordSlot(
  master: Uint8Array<ArrayBuffer>,
  password: string,
  params: Argon2Params,
): Promise<PasswordSlot> {
  const kdf = { name: 'argon2id' as const, salt: toBase64(randomBytes(SALT_BYTES)), ...params };
  return { kdf, ...(await seal(await passwordKey(password, kdf), 'key/password', master)) };
}

async function recoverySlot(
  master: Uint8Array<ArrayBuffer>,
): Promise<{ slot: RecoverySlot; recoveryKey: string }> {
  const secret = randomBytes(RECOVERY_BYTES);
  const kdf = { name: 'hkdf-sha256' as const, salt: toBase64(randomBytes(SALT_BYTES)) };
  const slot = { kdf, ...(await seal(await recoveryKeyFrom(secret, kdf.salt), 'key/recovery', master)) };
  return { slot, recoveryKey: formatRecoveryKey(secret) };
}

// --- recovery key text ----------------------------------------------------

function formatRecoveryKey(secret: Uint8Array): string {
  return toBase32(secret).match(/.{1,4}/g)!.join('-');
}

/** Parse a typed recovery key; tolerant of case, spaces and dashes. */
function parseRecoveryKey(text: string): Uint8Array<ArrayBuffer> | null {
  const bytes = fromBase32(text);
  return bytes && bytes.length === RECOVERY_BYTES ? bytes : null;
}

// --- key hierarchy --------------------------------------------------------

/** Create a fresh master key protected by `password` and a new recovery key. */
export async function createVaultKeys(
  password: string,
  params: Argon2Params = DEFAULT_ARGON2,
): Promise<{ keys: VaultKeys; recoveryKey: string }> {
  const raw = randomBytes(KEY_BYTES);
  const [password_, recovery] = await Promise.all([
    passwordSlot(raw, password, params),
    recoverySlot(raw),
  ]);
  return {
    keys: {
      master: await aesKey(raw, true),
      keyring: { password: password_, recovery: recovery.slot },
    },
    recoveryKey: recovery.recoveryKey,
  };
}

export async function unlockWithPassword(keyring: Keyring, password: string): Promise<VaultKeys> {
  const kek = await passwordKey(password, keyring.password.kdf);
  const raw = await open(kek, 'key/password', keyring.password, () => new WrongSecretError());
  return { master: await aesKey(raw, true), keyring };
}

export async function unlockWithRecoveryKey(keyring: Keyring, recoveryKey: string): Promise<VaultKeys> {
  const secret = parseRecoveryKey(recoveryKey);
  if (!secret) throw new WrongSecretError();
  const kek = await recoveryKeyFrom(secret, keyring.recovery.kdf.salt);
  const raw = await open(kek, 'key/recovery', keyring.recovery, () => new WrongSecretError());
  return { master: await aesKey(raw, true), keyring };
}

/** The same master key, now opened by `password` instead of the old one. */
export async function changePassword(
  keys: VaultKeys,
  password: string,
  params: Argon2Params = DEFAULT_ARGON2,
): Promise<VaultKeys> {
  const slot = await passwordSlot(await masterBytes(keys), password, params);
  return { master: keys.master, keyring: { ...keys.keyring, password: slot } };
}

/** Replace the recovery key; the previous one stops working. */
export async function replaceRecoveryKey(
  keys: VaultKeys,
): Promise<{ keys: VaultKeys; recoveryKey: string }> {
  const { slot, recoveryKey } = await recoverySlot(await masterBytes(keys));
  return {
    keys: { master: keys.master, keyring: { ...keys.keyring, recovery: slot } },
    recoveryKey,
  };
}

// --- diary file -----------------------------------------------------------

const isString = (value: unknown): value is string => typeof value === 'string';

function isSealed(value: unknown): value is Sealed {
  const v = value as Partial<Sealed> | null;
  return !!v && isString(v.iv) && isString(v.data);
}

function validArgon2(kdf: Partial<PasswordSlot['kdf']>): boolean {
  return (
    kdf.name === 'argon2id' &&
    isString(kdf.salt) &&
    (['memoryKiB', 'iterations', 'parallelism'] as const).every((field) => {
      const n = kdf[field];
      return Number.isInteger(n) && n! >= 1 && n! <= MAX_ARGON2[field];
    })
  );
}

function isKeyring(value: unknown): value is Keyring {
  const k = value as Partial<Keyring> | null;
  return (
    !!k &&
    isSealed(k.password) &&
    validArgon2(k.password.kdf ?? {}) &&
    isSealed(k.recovery) &&
    k.recovery.kdf?.name === 'hkdf-sha256' &&
    isString(k.recovery.kdf.salt)
  );
}

/** Cheap sniff: does this text look like an encrypted diary (vs. plain .ics)? */
export function isEncryptedVault(text: string): boolean {
  return text.trimStart().startsWith('{') && text.includes(VAULT_FORMAT);
}

/** Parse an encrypted diary file; throws `CorruptVaultError` if malformed. */
export function parseEncryptedVault(text: string): EncryptedVaultFile {
  let value: Partial<EncryptedVaultFile>;
  try {
    value = JSON.parse(text);
  } catch {
    throw new CorruptVaultError();
  }
  if (value?.format !== VAULT_FORMAT) throw new CorruptVaultError();
  if (value.version !== VERSION) {
    throw new CorruptVaultError('This diary was encrypted by a newer version of Icarus');
  }
  if (!isKeyring(value.keyring) || !isSealed(value.payload)) throw new CorruptVaultError();
  return value as EncryptedVaultFile;
}

export async function encryptVaultText(keys: VaultKeys, ics: string): Promise<string> {
  const file: EncryptedVaultFile = {
    format: VAULT_FORMAT,
    version: VERSION,
    keyring: keys.keyring,
    payload: await seal(keys.master, 'vault', utf8Encode(ics)),
  };
  return JSON.stringify(file);
}

export async function decryptVaultText(keys: VaultKeys, text: string): Promise<string> {
  const file = parseEncryptedVault(text);
  return utf8Decode(await open(keys.master, 'vault', file.payload, () => new CorruptVaultError()));
}

// --- key-value items ------------------------------------------------------

export function isSealedValue(value: unknown): value is SealedValue {
  return isSealed(value) && (value as SealedValue).format === SEALED_FORMAT;
}

export async function sealValue(keys: VaultKeys, purpose: string, value: unknown): Promise<SealedValue> {
  const sealed = await seal(keys.master, `item/${purpose}`, utf8Encode(JSON.stringify(value)));
  return { format: SEALED_FORMAT, version: VERSION, ...sealed };
}

export async function openValue<T>(keys: VaultKeys, purpose: string, sealed: SealedValue): Promise<T> {
  if (sealed.version !== VERSION) throw new CorruptVaultError();
  const plain = await open(keys.master, `item/${purpose}`, sealed, () => new CorruptVaultError());
  return JSON.parse(utf8Decode(plain)) as T;
}
