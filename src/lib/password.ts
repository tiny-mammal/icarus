/**
 * A deliberately simple password strength estimate. It cannot know whether a
 * password is reused or famous; it only nudges toward length, which is what
 * protects an encrypted file against offline guessing.
 */

export const MIN_PASSWORD_LENGTH = 10;

export type PasswordStrength = 'too-short' | 'weak' | 'fair' | 'strong';

export interface PasswordAssessment {
  strength: PasswordStrength;
  /** 0–3, for a meter. */
  score: number;
  acceptable: boolean;
  hint: string;
}

/** Rough entropy in bits: length × log2(size of the character pool used). */
function estimateBits(password: string): number {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33;
  const unique = new Set(password).size;
  // Repetitive passwords ("aaaaaaaaaaaa") don't earn their full length.
  const effectiveLength = Math.min([...password].length, unique * 3);
  return effectiveLength * Math.log2(Math.max(pool, 1));
}

export function assessPassword(password: string): PasswordAssessment {
  if ([...password].length < MIN_PASSWORD_LENGTH) {
    return {
      strength: 'too-short',
      score: 0,
      acceptable: false,
      hint: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  const bits = estimateBits(password);
  if (bits < 50) {
    return {
      strength: 'weak',
      score: 1,
      acceptable: true,
      hint: 'Weak. A phrase of several random words is easier to remember and much stronger.',
    };
  }
  if (bits < 75) {
    return { strength: 'fair', score: 2, acceptable: true, hint: 'Fair. A few more words would make it strong.' };
  }
  return { strength: 'strong', score: 3, acceptable: true, hint: 'Strong.' };
}
