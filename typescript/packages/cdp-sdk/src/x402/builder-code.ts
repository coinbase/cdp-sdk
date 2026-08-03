/*
 * Validation and attribution helpers for the x402 builder-code extension.
 *
 * Upstream validates codes with `BUILDER_CODE_PATTERN.test()`, which coerces its
 * argument — `42` and `["my_app"]` both stringify into something the pattern
 * accepts. Config values reaching the SDK are not always typed (a `configPath`
 * file is untyped JSON), so the type is checked here before the pattern runs.
 */

import {
  BUILDER_CODE,
  BUILDER_CODE_PATTERN,
  BUILDER_CODE_SCHEMA,
} from "@x402/extensions/builder-code";

import type { PaymentPayload } from "@x402/core/types";
import type {
  BuilderCodeExtensionData,
  BuilderCodeRequiredExtension,
} from "@x402/extensions/builder-code";

/** Shared tail of every builder-code rejection message. */
const CODE_REQUIREMENT =
  "Must be a string of 1-32 characters, lowercase alphanumeric and underscores only.";

/**
 * Service code every `CdpX402Client` attaches to `s`, alongside any codes the
 * caller configures, for on-chain attribution of CDP SDK-originated payments.
 */
export const CDP_SDK_CLIENT_BUILDER_CODE = "cdp_sdk_client";

/**
 * Service code every `createX402Server` EVM route attaches to `s`, alongside
 * the developer's own app code (`a`) if configured, for on-chain attribution
 * of payments received through the CDP SDK.
 */
export const CDP_SDK_SERVER_BUILDER_CODE = "cdp_sdk_server";

/**
 * Asserts that a value is a syntactically valid builder code.
 *
 * @param code - Candidate builder code, possibly from untyped JSON.
 * @throws If `code` is not a string matching `^[a-z0-9_]{1,32}$`.
 */
export function assertBuilderCode(code: unknown): asserts code is string {
  if (typeof code !== "string" || !BUILDER_CODE_PATTERN.test(code)) {
    throw new Error(`Invalid builder code: ${JSON.stringify(code)}. ${CODE_REQUIREMENT}`);
  }
}

/**
 * Normalizes a client `builderCode` config value into a non-empty array of
 * validated service codes.
 *
 * @param builderCode - A single service code, or an array of them.
 * @returns The validated service codes.
 * @throws If any code is invalid, or if the array is empty — an empty array
 * would otherwise register an extension that attaches no attribution.
 */
export function toServiceBuilderCodes(builderCode: unknown): string[] {
  const codes = Array.isArray(builderCode) ? builderCode : [builderCode];
  if (codes.length === 0) {
    throw new Error(
      "Invalid builder code: []. Supply at least one code, or omit builderCode to leave the extension unset.",
    );
  }
  for (const code of codes) {
    assertBuilderCode(code);
  }
  return codes;
}

/**
 * Reads a builder-code extension's `s` field as an array, whatever shape it's in.
 *
 * @param extension - Builder-code extension value, or `undefined` if absent.
 * @returns The service codes as an array, or an empty array if none are set.
 */
function readServiceCodes(extension: { info?: BuilderCodeExtensionData } | undefined): string[] {
  const s = extension?.info?.s;
  if (Array.isArray(s)) return s;
  return s ? [s] : [];
}

/**
 * Deduplicates builder codes, keeping the first occurrence of each.
 *
 * @param codes - Builder codes to deduplicate.
 * @returns The codes in their original order, with duplicates removed.
 */
function dedupeBuilderCodes(codes: string[]): string[] {
  return [...new Set(codes)];
}

/**
 * Ensures this client's own service codes survive in a payment payload's
 * `builder-code` extension, even when `@x402/core`'s extension merge would
 * otherwise have dropped them.
 *
 * `@x402/core` treats server-declared `builder-code` fields as authoritative:
 * when the resource server also declares `s` (as `createX402Server` does, to
 * attach its own service code), the merge silently discards whatever this
 * client's registered extension(s) contributed for that field, instead of
 * combining them. This re-derives the union directly. Only `s` is touched —
 * `a` (the server's app code) is always left exactly as `@x402/core` resolved it.
 *
 * Known gap: a service code attached by a custom `ClientExtension` registered
 * via `registerExtension` (bypassing `builderCode` config) is only preserved
 * here when the server didn't itself declare `s`. Once the server's `s` wins
 * the upstream merge, there's no way to recover a value that a third-party
 * extension computed but never surfaced in the final payload.
 *
 * @param payload - Payment payload returned by the base `x402Client`.
 * @param clientCodes - This client's own validated service codes (already
 * includes {@link CDP_SDK_CLIENT_BUILDER_CODE}).
 * @returns The payload with a corrected, deduplicated `s` array.
 */
export function reconcileServiceBuilderCodes(
  payload: PaymentPayload,
  clientCodes: string[],
): PaymentPayload {
  const existing = payload.extensions?.[BUILDER_CODE] as
    | { info?: BuilderCodeExtensionData }
    | undefined;

  return {
    ...payload,
    extensions: {
      ...payload.extensions,
      [BUILDER_CODE]: {
        ...existing,
        info: {
          ...existing?.info,
          s: dedupeBuilderCodes([...readServiceCodes(existing), ...clientCodes]),
        },
      },
    },
  };
}

/**
 * Builds the `builder-code` extension declaration for `createX402Server`
 * routes: the developer's own app code (`a`), if configured, alongside this
 * SDK's own service code (`s`) for on-chain attribution.
 *
 * @param appCode - Developer-configured app code (already validated), or
 * `undefined` to omit `a` and advertise only the SDK's own service code.
 * @returns Extension declaration for `PaymentRequired.extensions["builder-code"]`.
 */
export function declareServerBuilderCodeExtension(appCode?: string): BuilderCodeRequiredExtension {
  return {
    info: {
      ...(appCode !== undefined && { a: appCode }),
      s: [CDP_SDK_SERVER_BUILDER_CODE],
    },
    schema: BUILDER_CODE_SCHEMA,
  };
}
