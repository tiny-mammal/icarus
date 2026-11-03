import { describe, expect, it } from 'vitest';
import { fromBase32, fromBase64, toBase32, toBase64 } from '../src/lib/crypto/encoding';
import {
  CorruptVaultError,
  WrongSecretError,
  changePassword,
  createVaultKeys,
  decryptVaultText,
  encryptVaultText,
  isEncryptedVault,
  openValue,
  parseEncryptedVault,
  replaceRecoveryKey,
  sealValue,
  unlockWithPassword,
  unlockWithRecoveryKey,
  type Argon2Params,
} from '../src/lib/crypto/vault';

// Real Argon2id, with test-sized cost so the suite stays fast.
const FAST: Argon2Params = { memoryKiB: 256, iterations: 1, parallelism: 1 };
const ICS = 'BEGIN:VCALENDAR\r\nSUMMARY:Querido diario — ñ, 日本, 🙂\r\nEND:VCALENDAR\r\n';

describe('encodings', () => {
  it('round-trips base64 for large buffers', () => {
    const bytes = new Uint8Array(200_000).map((_, i) => i * 7);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });

  it('round-trips Crockford base32 and forgives look-alikes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255, 128]);
    const text = toBase32(bytes);
    expect(fromBase32(text)).toEqual(bytes);
    expect(fromBase32(text.toLowerCase().replace(/0/g, 'o'))).toEqual(bytes);
    expect(fromBase32('not base32!')).toBeNull();
  });
});

describe('encrypted vault', () => {
  it('encrypts the diary so it is unreadable without the password', async () => {
    const { keys } = await createVaultKeys('correct horse battery', FAST);
    const file = await encryptVaultText(keys, ICS);

    expect(isEncryptedVault(file)).toBe(true);
    expect(isEncryptedVault(ICS)).toBe(false);
    expect(file).not.toContain('Querido');

    const reopened = await unlockWithPassword(parseEncryptedVault(file).keyring, 'correct horse battery');
    expect(await decryptVaultText(reopened, file)).toBe(ICS);
    await expect(unlockWithPassword(parseEncryptedVault(file).keyring, 'wrong password'))
      .rejects.toBeInstanceOf(WrongSecretError);
  });

  it('opens with the recovery key, typed loosely', async () => {
    const { keys, recoveryKey } = await createVaultKeys('correct horse battery', FAST);
    expect(recoveryKey).toMatch(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/);
    const file = await encryptVaultText(keys, ICS);
    const { keyring } = parseEncryptedVault(file);

    const typed = ` ${recoveryKey.toLowerCase().replace(/-/g, ' ')} `;
    expect(await decryptVaultText(await unlockWithRecoveryKey(keyring, typed), file)).toBe(ICS);
    await expect(unlockWithRecoveryKey(keyring, 'AAAA-BBBB')).rejects.toBeInstanceOf(WrongSecretError);
  });

  it('changes the password without re-encrypting existing data', async () => {
    const { keys, recoveryKey } = await createVaultKeys('old password!', FAST);
    const draft = await sealValue(keys, 'drafts/drafts', [{ title: 'secret' }]);
    const changed = await changePassword(keys, 'new password!', FAST);
    const file = await encryptVaultText(changed, ICS);
    const { keyring } = parseEncryptedVault(file);

    await expect(unlockWithPassword(keyring, 'old password!')).rejects.toBeInstanceOf(WrongSecretError);
    const reopened = await unlockWithPassword(keyring, 'new password!');
    expect(await openValue(reopened, 'drafts/drafts', draft)).toEqual([{ title: 'secret' }]);
    // The recovery key survives a password change.
    await expect(unlockWithRecoveryKey(keyring, recoveryKey)).resolves.toBeTruthy();
  });

  it('invalidates the old recovery key when it is replaced', async () => {
    const { keys, recoveryKey: oldKey } = await createVaultKeys('password one', FAST);
    const replaced = await replaceRecoveryKey(keys);
    const { keyring } = parseEncryptedVault(await encryptVaultText(replaced.keys, ICS));

    await expect(unlockWithRecoveryKey(keyring, oldKey)).rejects.toBeInstanceOf(WrongSecretError);
    await expect(unlockWithRecoveryKey(keyring, replaced.recoveryKey)).resolves.toBeTruthy();
  });

  it('detects tampering and binds each ciphertext to its purpose', async () => {
    const { keys } = await createVaultKeys('correct horse battery', FAST);
    const file = JSON.parse(await encryptVaultText(keys, ICS));
    const bytes = fromBase64(file.payload.data);
    bytes[0] ^= 1;
    file.payload.data = toBase64(bytes);
    await expect(decryptVaultText(keys, JSON.stringify(file))).rejects.toBeInstanceOf(CorruptVaultError);

    const sealed = await sealValue(keys, 'drafts/drafts', ['draft']);
    await expect(openValue(keys, 'settings/spellWords', sealed)).rejects.toBeInstanceOf(CorruptVaultError);
  });

  it('rejects malformed headers and unreasonable key-derivation costs', async () => {
    const { keys } = await createVaultKeys('correct horse battery', FAST);
    const file = JSON.parse(await encryptVaultText(keys, ICS));
    expect(() => parseEncryptedVault('{"format":"icarus-encrypted-diary"')).toThrow(CorruptVaultError);
    file.keyring.password.kdf.memoryKiB = 64 * 1024 * 1024;
    expect(() => parseEncryptedVault(JSON.stringify(file))).toThrow(CorruptVaultError);
    file.keyring.password.kdf.memoryKiB = FAST.memoryKiB;
    file.version = 2;
    expect(() => parseEncryptedVault(JSON.stringify(file))).toThrow('newer version');
  });

  it('handles a multi-megabyte diary quickly', async () => {
    const { keys } = await createVaultKeys('correct horse battery', FAST);
    const big = `BEGIN:VCALENDAR\r\n${'DESCRIPTION:Un día cualquiera en el diario.\r\n'.repeat(100_000)}END:VCALENDAR\r\n`;
    expect(big.length).toBeGreaterThan(4_000_000);
    const started = performance.now();
    const file = await encryptVaultText(keys, big);
    expect(await decryptVaultText(keys, file)).toBe(big);
    expect(performance.now() - started).toBeLessThan(3000);
  });
});
