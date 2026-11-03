/** A backup destination already contains a file that must be preserved. */
export class BackupExistsError extends Error {
  constructor() {
    super('Choose a new filename for the backup');
    this.name = 'BackupExistsError';
  }
}

/** An import destination folder already holds a diary that must be preserved. */
export class FolderHasDiaryError extends Error {
  constructor() {
    super('The selected folder already contains a diary');
    this.name = 'FolderHasDiaryError';
  }
}

/** The diary (or a private item) is encrypted and no key is unlocked. */
export class VaultLockedError extends Error {
  constructor() {
    super('The diary is locked');
    this.name = 'VaultLockedError';
  }
}
