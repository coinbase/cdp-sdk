# Go SDK Changelog

## [Unreleased]

### Features

- Revoke delegation now calls `POST .../delegation/revoke` and `POST .../address/{address}/delegation/revoke`. The old `DELETE` endpoints remain as `revokeDelegationForEndUserDeprecated` and `revokeDelegationForEndUserAccountDeprecated` until 2026-10-22. The generated request body type for all four operations is now `RevokeDelegationRequest`. Also adds the Mandates API (`createMandate`, `getMandate`, `listMandates`, `cancelMandate`, `approveWalletMandate`, `revokeWalletMandate`, `authorizeMandatePaymentSession`, and related approval and revocation reads) from the cdp-api master spec.
- Add support for SendEndUserEvmAsset, SendEndUserSolAsset, and CreateEndUserEvmSwap policy rules and criteria
- Regenerate OpenAPI client with latest spec updates
- Added support for calling public (unauthenticated) OpenAPI endpoints without configuring API credentials. Missing credential errors are now raised at request time only for authenticated endpoints.

### Fixes

- Regenerate the OpenAPI client from `c3/cdp-api@a308e789`, including customer-requirements and borrowing operations, Solana encoding options, and updated webhook metadata/label and policy-rule schemas.
- Webhook request/update metadata and labels, and response labels, now use pointers to named map types (`WebhookMetadata`, `WebhookRequestLabels`, `WebhookResponseLabels`) instead of the previous types. Convert existing values to the corresponding generated type before taking their address.

## [1.1.0] - 2025-07-21

### Changes

- Hash request body in wallet JWT claims instead of including the full body to avoid large header size issues.

## [1.0.0] - 2025-04-14

### Features

- Initial release of the CDP SDK.
