---
"@coinbase/cdp-sdk": major
---

Migrated TypeScript policy validation to Zod 4.6.7 or later, addressing GHSA-mrhx-c7xc-m3w5 for constrained collections without dependency overrides or local patches. Updated abitype to 1.3.0 and migrated ABI and address validation from its deprecated Zod 3 declarations to the Zod 4 schemas in Ox. Retained string-keyed EIP-712 type records.

Exported policy schemas and validation errors now use Zod 4. Consumers composing these schemas must use Zod 4-compatible schemas. Read validation details from `ZodError.issues` rather than the removed `errors` alias; issue codes and messages follow Zod 4. Integer schemas now reject integers outside JavaScript's safe integer range. Oversized constrained collections fail before their elements are validated.
