---
"@coinbase/cdp-sdk": patch
---

Bump axios from `1.13.6` to `^1.16.0` in `typescript/src/package.json` to pick up security fixes for [GHSA-fvcv-3m26-pcqx](https://github.com/advisories/GHSA-fvcv-3m26-pcqx) (Cloud Metadata Exfiltration via Header Injection) and [GHSA-3p68-rc4w-qgx5](https://github.com/advisories/GHSA-3p68-rc4w-qgx5) (NO_PROXY Hostname Normalization Bypass leading to SSRF), both patched in `1.15.0`. The exact `1.13.6` pin (originally added in #631 to block the compromised `1.14.1` release) prevented consumers from receiving these patches via `npm update` / `npm audit fix`. A semver range allows future patch bumps without re-pinning. `1.14.x` is excluded by `^1.16.0`.

Closes #681.
