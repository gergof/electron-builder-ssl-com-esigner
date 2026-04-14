# electron-builder-ssl-com-esigner

[![NPM version](https://img.shields.io/npm/v/electron-builder-ssl-com-esigner?logo=npm)](https://www.npmjs.com/package/electron-builder-ssl-com-esigner)
[![TypeScript types](https://img.shields.io/npm/types/electron-builder-ssl-com-esigner?logo=typescript)](https://www.npmjs.com/package/electron-builder-ssl-com-esigner)
[![License](https://img.shields.io/github/license/gergof/electron-builder-ssl-com-esigner)](https://github.com/gergof/electron-builder-ssl-com-esigner/blob/master/LICENSE)
[![Build status](https://github.com/gergof/electron-builder-ssl-com-esigner/actions/workflows/publish.yml/badge.svg)](https://github.com/gergof/electron-builder-ssl-com-esigner/actions/workflows/publish.yml)

Electron Builder signing hook for Windows builds that uses SSL.com's eSigner `CodeSignTool` under the hood.

This package is intended for teams that build Electron apps with `electron-builder` and want to sign Windows artifacts with an SSL.com eSigner credential instead of a local certificate or custom signing script.

## What it does

- Integrates directly with Electron Builder through `win.sign`.
- Uses SSL.com's Java-based `CodeSignTool` internally.
- Reads signing credentials from environment variables.
- Overrides any previous signature on the target file before applying the eSigner signature.
- Works well in CI/CD where interactive certificate access is not practical.

## Prerequisites

Before using this package, make sure all of the following are in place:

- An active SSL.com eSigner-enabled code signing setup.
- Your certificate is enrolled and usable from eSigner.
- Java is installed and available on `PATH`.
- A Windows Electron build configured through `electron-builder`.

Java is required because SSL.com's `CodeSignTool`, which this package invokes internally, is a Java application.

For SSL.com setup and enrollment, these guides are the relevant references:

- [eSigner setup and enrollment](https://www.ssl.com/guide/remote-ev-code-signing-with-esigner/)
- [eSigner CodeSignTool Command Guide](https://www.ssl.com/guide/esigner-codesigntool-command-guide/)

## Installation

```bash
npm install electron-builder-ssl-com-esigner
```

The package downloads SSL.com's eSigner tooling during installation.

## Required environment variables

The signer reads its configuration from environment variables prefixed with `SSL_COM_ESIGNER_`.

| Variable | Required | Description |
| --- | --- | --- |
| `SSL_COM_ESIGNER_CREDENTIAL_ID` | Yes | SSL.com eSigner credential ID. Required in practice for deterministic CI configuration, and especially important if the account has more than one signing credential. |
| `SSL_COM_ESIGNER_USERNAME` | Yes | SSL.com account username used by `CodeSignTool`. |
| `SSL_COM_ESIGNER_PASSWORD` | Yes | SSL.com account password used by `CodeSignTool`. |
| `SSL_COM_ESIGNER_TOTP_SECRET` | Yes | TOTP secret for automated signing. This is what allows non-interactive signing in CI/CD. |
| `SSL_COM_ESIGNER_DEBUG` | No | Set to `true` to print verbose signer logs. |

Example:

```bash
export SSL_COM_ESIGNER_CREDENTIAL_ID="your-credential-id"
export SSL_COM_ESIGNER_USERNAME="your-sslcom-username"
export SSL_COM_ESIGNER_PASSWORD="your-sslcom-password"
export SSL_COM_ESIGNER_TOTP_SECRET="your-esigner-totp-secret"
```

## Electron Builder integration

Configure Electron Builder to use this package as the Windows signer:

```json
{
  "build": {
    "win": {
      "sign": "electron-builder-ssl-com-esigner",
      "signingHashAlgorithms": ["sha256"]
    }
  }
}
```

Or in `electron-builder.yml`:

```yaml
win:
  sign: electron-builder-ssl-com-esigner
  signingHashAlgorithms:
    - sha256
```

`win.sign` must be set to `"electron-builder-ssl-com-esigner"` so Electron Builder delegates Windows signing to this library.

### Important note about `signingHashAlgorithms`

Set `signingHashAlgorithms` to `["sha256"]` only.

This signer does not use Electron Builder's configured hash algorithm list to drive the actual SSL.com signing operation. SSL.com's `CodeSignTool` determines the effective signing behavior itself. In other words, setting `sha1`, or attempting `["sha1", "sha256"]`, does not make this package produce the legacy dual-signing behavior you might expect from other Windows signing flows.

That means:

- `sha1` should not be used. It is deprecated.
- The array should contain a single value: `sha256`.
- Trying to force dual-signing or nested signatures here has no practical effect with this signer.
- At best it creates confusion in the build config; at worst it can cause extra signing passes elsewhere in your pipeline and burn signing credits for no benefit.

Because SSL.com's `CodeSignTool` is already performing the signing step, you should avoid layering additional Windows signing steps on top of this plugin. Prevent double-signing and signature nesting in custom scripts, post-build hooks, or external CI stages.

## How signing is invoked

This package executes SSL.com's `CodeSignTool` in override mode against each file Electron Builder asks it to sign.

In a standard Electron Builder Windows flow, the signer is typically invoked four times:

1. Your packaged application executable
2. `elevate.exe`
3. The installer
4. The uninstaller

As a result, one Windows build commonly consumes four SSL.com signing operations. If your SSL.com plan is credit-based, account for that in your usage and cost estimates.

## Example CI usage

```yaml
name: build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: windows-latest
    env:
      SSL_COM_ESIGNER_CREDENTIAL_ID: ${{ secrets.SSL_COM_ESIGNER_CREDENTIAL_ID }}
      SSL_COM_ESIGNER_USERNAME: ${{ secrets.SSL_COM_ESIGNER_USERNAME }}
      SSL_COM_ESIGNER_PASSWORD: ${{ secrets.SSL_COM_ESIGNER_PASSWORD }}
      SSL_COM_ESIGNER_TOTP_SECRET: ${{ secrets.SSL_COM_ESIGNER_TOTP_SECRET }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - run: npm ci
      - run: npx electron-builder --win
```

## Operational guidance

- Keep the SSL.com credentials in CI secrets, not in checked-in config files.
- Ensure Java is installed on every machine that performs signing.
- Do not add a second signing pass with `signtool` or another Electron Builder hook.
- If your build signs multiple targets or architectures, total signing consumption will increase accordingly.

## Troubleshooting

### `Java not installed`

Install Java and make sure `java` is available on `PATH`.

### Missing eSigner tool

The package expects its post-install download step to complete successfully. Reinstall dependencies if the bundled eSigner files were not downloaded.

### eSigner authentication or OTP failures

Verify:

- The username and password are correct.
- The credential ID matches the certificate you intend to use.
- The TOTP secret is the correct one for that credential and account setup.

### The signing step succeeds, but the file is not validly signed

Enable `SSL_COM_ESIGNER_DEBUG=true` and inspect the plugin output.

SSL.com's `CodeSignTool` does not reliably signal all failures through its process exit code alone. In practice, this package has to detect some failures by parsing stdout and stderr output. That detection is based on observed tool behavior and trial-and-error, so it may not catch every possible failure mode.

If you find a case where the signing step appears to succeed but the produced file still does not contain a valid signature, please open an issue on GitHub and include the debug logs. If there is another failure pattern that should be detected, it should be added to the plugin.

## License

[MIT](https://github.com/gergof/electron-builder-ssl-com-esigner/blob/master/LICENSE)
