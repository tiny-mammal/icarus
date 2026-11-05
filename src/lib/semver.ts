/**
 * SemVer helpers shared by the app (update checks), the release script and
 * the site (`site/releases.ts`). Dependency-free so Node can run it directly.
 */

/** SemVer, with optional pre-release and build metadata. */
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function isVersion(value: string): boolean {
  return VERSION_PATTERN.test(value);
}

/** Compare two versions by SemVer precedence (build metadata is ignored). */
export function compareVersions(a: string, b: string): number {
  const split = (version: string) => {
    const [core, ...pre] = version.split('+')[0].split('-');
    return { core: core.split('.').map(Number), pre: pre.join('-') };
  };
  const [left, right] = [split(a), split(b)];
  for (let i = 0; i < 3; i++) {
    const diff = (left.core[i] ?? 0) - (right.core[i] ?? 0);
    if (diff) return diff;
  }
  // A pre-release sorts before its final release: 1.0.0-rc.1 < 1.0.0.
  if (!left.pre || !right.pre) return (left.pre ? -1 : 0) - (right.pre ? -1 : 0);
  const [lp, rp] = [left.pre.split('.'), right.pre.split('.')];
  for (let i = 0; i < Math.min(lp.length, rp.length); i++) {
    const [l, r] = [lp[i], rp[i]];
    if (l === r) continue;
    const [ln, rn] = [/^\d+$/.test(l), /^\d+$/.test(r)];
    if (ln && rn) return Number(l) - Number(r);
    if (ln !== rn) return ln ? -1 : 1; // Numeric identifiers sort first.
    return l < r ? -1 : 1;
  }
  return lp.length - rp.length;
}
