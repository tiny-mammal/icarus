# Releases

Bump `version` in `package.json`, merge, then push a matching tag:

```bash
git tag v0.5.0 && git push origin v0.5.0
```

`.github/workflows/release.yml` builds every platform, uploads to R2 under
`v<version>/`, and updates `latest.json`. It refuses a version that isn't newer
than the published one, so ship fixes as a new version.

## Android signing key

The APK is signed with the project key (repository secrets
`ANDROID_KEYSTORE_BASE64` and `ANDROID_KEYSTORE_PASSWORD`, alias `icarus`).
**Keep an offline copy.** Android only accepts updates signed with the same
key. If it's lost, users have to uninstall, and lose their diary, to update.

The workflow pins the certificate in `ANDROID_CERT_SHA256` and refuses to
publish anything else. Update both together if the key ever changes.

## Code signing

Desktop builds aren't code-signed yet, so macOS Gatekeeper and Windows
SmartScreen warn on first launch. The download page explains how to get past
that.
