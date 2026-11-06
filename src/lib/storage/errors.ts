/** A backup destination already contains a file that must be preserved. */
export class BackupExistsError extends Error {
  constructor() {
    super('Choose a new filename for the backup');
    this.name = 'BackupExistsError';
  }
}

/** The diary (or a private item) is encrypted and no key is unlocked. */
export class VaultLockedError extends Error {
  constructor() {
    super('The diary is locked');
    this.name = 'VaultLockedError';
  }
}
