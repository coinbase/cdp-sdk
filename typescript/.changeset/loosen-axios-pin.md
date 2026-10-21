---
"@coinbase/cdp-sdk": patch
---

Loosen the exact axios pin to ^1.18.0 so consumers can pick up axios security patches. Ten advisories affecting axios 1.16.0 have been published since the pin was set, including GHSA-gcfj-64vw-6mp9 (high).
