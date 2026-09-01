# Proposal: Arbitrary-length message signing for CDP-custodied Solana accounts

**Audience:** Wallets / cdp-service platform team
**Author:** Carson Roscoe (CDP SDK)
**Status:** Draft for discussion
**Related:** `cdp-sdk` x402 v2 scheme expansion (`feat/x402-expand-supported-schemes`)

## Summary

CDP SDK's x402 server integration wants to support the `upto` payment scheme on Solana using CDP-custodied server accounts. This requires signing an arbitrary 50-byte binary "settlement voucher" with a Solana account's key. Today, **no CDP API can do this for a server (custodied) Solana account** — `signSolanaMessage` only signs the literal UTF-8 bytes of a string, and there's no `signSolanaHash`-style endpoint for server accounts (unlike EVM, which has `signEvmHash`).

This doc proposes closing that gap with a minimal, backward-compatible change: let `signSolanaMessage` accept a `base64`-encoded payload, mirroring what already exists for **end-user** Solana accounts today.

## Background: what x402 `upto` needs

x402's `upto` payment scheme (channel/voucher-based, in `@x402/svm` and the CDP facilitator's Go implementation) requires the resource server to sign a canonical 50-byte binary voucher on each settlement:

```
magic (2 bytes: 0x56 0x01) || channelId (32 bytes, raw pubkey) || cumulativeAmount (8 bytes, u64 LE) || expiresAt (8 bytes, i64 LE)
```

This is raw binary — virtually never valid UTF-8 (the `channelId` bytes are effectively random). The resource server's key here is called the `receiverAuthorizer` / `receiverAuthorizerSigner`. This is exactly analogous to what `@x402/evm`'s schemes already require and get today via EVM's `signEvmHash`.

The CDP-hosted facilitator's `/supported` endpoint already advertises `upto` support on Solana (mainnet + devnet), and its own verification logic is fully implemented and tested — the facilitator side is ready. **The only missing piece is a way for a CDP-custodied server-side Solana account to produce this signature.**

## Current state

| Capability | Endpoint | Account type | Arbitrary bytes? |
|---|---|---|---|
| Sign message | `POST /v2/solana/accounts/{address}/sign/message` | Server (custodied) | **No** — signs literal UTF-8 bytes of the `message` string, no decoding, no framing |
| Sign transaction | `POST /v2/solana/accounts/{address}/sign/transaction` | Server (custodied) | N/A — requires a well-formed Solana transaction |
| Sign hash | — | Server (custodied) | **Does not exist** |
| Sign message | `.../end-users/{userId}/solana/sign/message` | End-user (embedded wallet) | **Yes** — base64-decodes `message` before signing |
| Sign hash | `.../end-users/{userId}/solana/sign` | End-user (embedded wallet), `x-audience: development` | Yes, but fixed at exactly 32 bytes |

For contrast, the EVM side already has full parity: `signEvmHash` signs an arbitrary 32-byte hash with no prefix, for server accounts, GA today.

Confirmed by reading the `cdp-service` handler directly — server-account message signing passes the string straight through with no decoding:

```go
// internal/apiv2/solana/sign_solana_message.go
resp, err := s.keyService.CreateSignature(ctx, &keyspb.CreateSignatureRequest{
    ProjectId: projectID,
    KeyId:     account.GetSigningKeyId(),
    Payload:   []byte(message),
    ...
```

Whereas the end-user equivalent already does exactly what we need, just on a different account type:

```go
// internal/apiv2/embeddedwallet/sign_solana_message_with_end_user_account.go
decodedMessage, err := base64.StdEncoding.DecodeString(req.Body.Message)
// ... decodedMessage is what actually gets signed
```

So the underlying key-service signing primitive already supports arbitrary-byte payloads — `CreateSignature`'s `Payload` field is just `[]byte`. The gap is purely in the server-account API contract layer, which never base64-decodes before calling it.

## Proposed change

**Option A — extend `signSolanaMessage` with an encoding field (recommended)**

Add an optional field to the existing endpoint, defaulting to today's behavior:

```jsonc
POST /v2/solana/accounts/{address}/sign/message
{
  "message": "<string>",
  "encoding": "utf8" | "base64"   // optional, defaults to "utf8" — fully backward compatible
}
```

When `encoding: "base64"` is supplied, base64-decode `message` before passing it to `keyService.CreateSignature` as `Payload` — identical to what `sign_solana_message_with_end_user_account.go` already does. No new endpoint, no key-service changes, no new signing primitive. This is the smallest possible change and reuses a code path that's already shipped and tested on the end-user side.

**Option B — add `signSolanaHash` for server accounts**

Mirror EVM's `signEvmHash` (`POST /v2/evm/accounts/{address}/sign/hash`) with a Solana equivalent that accepts arbitrary-length raw bytes (base64 or base58), not just the fixed 32-byte hash the dev-only end-user version currently supports. This is a new endpoint, more consistent with EVM's naming/shape, but has more surface area to review (new route, new OpenAPI schema, new e2e coverage) for what's functionally the same underlying change.

We have no strong preference between A and B — happy to align with whatever's more consistent with the platform's API conventions. **A is smaller and has a working precedent to copy; B is more consistent with the EVM naming scheme.**

## Backward compatibility

Both options are additive and non-breaking. Option A's `encoding` field defaults to `"utf8"`, so every existing caller is unaffected.

## Security considerations

This raises the same "don't sign a message you don't understand" concern the end-user endpoint's own docstring already calls out:

> **WARNING:** Never sign a message that you didn't generate, as it can be an arbitrary transaction. For example, it might send all of your funds to an attacker.

Since server accounts are only ever driven by the developer's own backend code (never directly by an untrusted end-user), the risk profile is arguably *lower* than the end-user embedded-wallet case this pattern already ships for today. We'd expect the same policy-engine / attestation hooks that already gate `signSolanaMessage` to continue applying unchanged.

## Non-goals

- This does not propose any change to transaction signing, `signSolanaTransaction`, or the facilitator/`upto` protocol itself — both already work correctly and are unaffected.
- This does not propose relaxing anything about the *end-user* endpoints, which already support this.

## Impact if this ships

With this change, `cdp-sdk`'s `createX402Server` could register `UptoSvmScheme` with a CDP-custodied `receiverAuthorizerSigner` by default — the same zero-config experience Base already gets for `exact`/`upto` — instead of requiring the caller to bring their own externally-held Solana keypair for this one role.

## Appendix: reference code

- `cdp-service/internal/apiv2/solana/sign_solana_message.go` — current server-account handler (UTF-8 only)
- `cdp-service/internal/apiv2/embeddedwallet/sign_solana_message_with_end_user_account.go` — existing base64 precedent (end-user accounts)
- `cdp-service/internal/apiv2/embeddedwallet/sign_solana_hash_with_end_user_account.go` — existing 32-byte-only precedent (end-user accounts, dev audience)
- `cdp-service/internal/apiv2/ethereum/sign_hash.go` — `signEvmHash`, the EVM parity we'd be matching
- `x402/go/mechanisms/svm/paymentchannels/voucher.go` (`EncodeVoucherMessage`) — canonical 50-byte voucher format the facilitator verifies against
- `@x402/svm`'s `upto/server` package (`encodeVoucherMessageBytes`) — identical format on the TypeScript side
- `cdp-facilitator/e2e/helpers/svm/upto_payload.go` (`UptoAuthorizer`) — the facilitator's own e2e tests sign this voucher with a locally-generated, uncustodied keypair today, since no CDP API can do it for them either
