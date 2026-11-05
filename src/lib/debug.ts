/**
 * Development-only switches, set with `?debug=<name>` on the dev server. In
 * production builds every flag is constant false.
 */
export function debugFlag(name: string): boolean {
  if (!import.meta.env.DEV || typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).get('debug') === name;
}
