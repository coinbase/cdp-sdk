# Go SDK Changelog

## [Unreleased]

### Features

- Regenerate OpenAPI clients from `c3/cdp-api@68ac40d4`: add `pausePolicy` (`POST /v2/policy-engine/policies/{policyId}/pause`) and `resumePolicy` (`POST /v2/policy-engine/policies/{policyId}/resume`), add `status`, `pausedAt`, and `resumeAt` to `Policy`, and add the onramp mobile session and iOS attestation operations.
- Regenerate OpenAPI clients from `c3/cdp-api@3312048b`: add `simulatePolicies` (`POST /v2/policy-engine/simulate`) and `createTopUpLink`, add top-up-link and customer-requirement webhook schemas, update disbursement `customerDisplay`, and remove `listCoinbaseAccountBalances`.
- Revoke delegation now calls `POST .../delegation/revoke` and `POST .../address/{address}/delegation/revoke`. The old `DELETE` endpoints remain as `revokeDelegationForEndUserDeprecated` and `revokeDelegationForEndUserAccountDeprecated` until 2026-10-22. The generated request body type for all four operations is now `RevokeDelegationRequest`. Also adds the Mandates API (`createMandate`, `getMandate`, `listMandates`, `cancelMandate`, `approveWalletMandate`, `revokeWalletMandate`, `authorizeMandatePaymentSession`, and related approval and revocation reads) from the cdp-api master spec.
- Add support for SendEndUserEvmAsset, SendEndUserSolAsset, and CreateEndUserEvmSwap policy rules and criteria
- Regenerate the OpenAPI client to add the EOA and smart-account vault redeem-fees operations, and send `X-Wallet-Auth` for smart-account lend requests.
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
