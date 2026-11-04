/**
 * Release helpers for `.github/workflows/release.yml`. Run with Node 24 (type
 * stripping), no build step:
 *
 *   node scripts/release-assets.ts version [tag]
 *     Print the app version from package.json. With a tag, fail unless it
 *     names that version (`v1.2.3`).
 *   node scripts/release-assets.ts collect <bundle-root> <platform> <out-dir>
 *     Copy the platform's bundles out of Tauri's `bundle/` directory under
 *     their public file names.
 *   node scripts/release-assets.ts manifest <dir> <out-file>
 *     Hash every collected file and write the `latest.json` manifest.
 *
 * The asset list itself lives in `site/releases.ts`, shared with the site.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ASSETS,
  assetFileName,
  releasePrefix,
  type PlatformId,
  type ReleaseManifest,
} from '../site/releases.ts';

const PLATFORMS: readonly PlatformId[] = ['windows', 'macos', 'linux'];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function appVersion(): string {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  if (typeof pkg.version !== 'string') fail('package.json has no version');
  return pkg.version;
}

function version(tag?: string): void {
  const current = appVersion();
  if (tag !== undefined && tag !== `v${current}`) {
    fail(`Tag ${tag} does not match package.json version ${current}. Bump the version first.`);
  }
  console.log(current);
}

function collect(bundleRoot: string, platform: string, outDir: string): void {
  if (!PLATFORMS.includes(platform as PlatformId)) fail(`Unknown platform: ${platform}`);
  const current = appVersion();
  mkdirSync(outDir, { recursive: true });
  for (const spec of ASSETS.filter((asset) => asset.platform === platform)) {
    const dir = join(bundleRoot, spec.bundleDir);
    const matches = readdirSync(dir).filter((name) => name.endsWith(`.${spec.extension}`));
    if (matches.length !== 1) {
      fail(`Expected one .${spec.extension} in ${dir}, found: ${matches.join(', ') || 'none'}`);
    }
    const target = join(outDir, assetFileName(spec, current));
    copyFileSync(join(dir, matches[0]), target);
    console.log(`${spec.id}: ${target}`);
  }
}

function manifest(dir: string, outFile: string): void {
  const current = appVersion();
  const files = new Set(readdirSync(dir));
  const assets: ReleaseManifest['assets'] = {};
  for (const spec of ASSETS) {
    const name = assetFileName(spec, current);
    if (!files.delete(name)) fail(`Missing release asset ${name} (${spec.id})`);
    const path = join(dir, name);
    assets[spec.id] = {
      key: releasePrefix(current) + name,
      name,
      size: statSync(path).size,
      sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
    };
  }
  if (files.size) fail(`Unexpected files in ${dir}: ${[...files].join(', ')}`);
  const result: ReleaseManifest = { version: current, published: new Date().toISOString(), assets };
  writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

const [command, ...args] = process.argv.slice(2);
switch (command) {
  case 'version':
    version(args[0]);
    break;
  case 'collect':
    if (args.length !== 3) fail('Usage: collect <bundle-root> <platform> <out-dir>');
    collect(args[0], args[1], args[2]);
    break;
  case 'manifest':
    if (args.length !== 2) fail('Usage: manifest <dir> <out-file>');
    manifest(args[0], args[1]);
    break;
  default:
    fail('Usage: release-assets.ts <version|collect|manifest> ...');
}
