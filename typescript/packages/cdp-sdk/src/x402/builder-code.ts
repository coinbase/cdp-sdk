/*
 * Validation and attribution helpers for the x402 builder-code extension.
 *
 * Upstream validates codes with `BUILDER_CODE_PATTERN.test()`, which coerces its
 * argument — `42` and `["my_app"]` both stringify into something the pattern
 * accepts. Config values reaching the SDK are not always typed (a `configPath`
 * file is untyped JSON), so the type is checked here before the pattern runs.
 */

import { BUILDER_CODE_PATTERN, BUILDER_CODE_SCHEMA } from "@x402/extensions/builder-code";

import type { BuilderCodeRequiredExtension } from "@x402/extensions/builder-code";

/** Shared tail of every builder-code rejection message. */
const CODE_REQUIREMENT =
  "Must be a string of 1-32 characters, lowercase alphanumeric and underscores only.";
const MAX_CONFIGURED_SERVICE_BUILDER_CODES = 4;

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
 * @throws If any code is invalid, or if the array has fewer than one or more
 * than four codes.
 */
export function toServiceBuilderCodes(builderCode: unknown): string[] {
  const codes = Array.isArray(builderCode) ? builderCode : [builderCode];
  if (codes.length === 0) {
    throw new Error(
      "Invalid builder code: []. Supply at least one code, or omit builderCode to use only the SDK's service code.",
    );
  }
  if (codes.length > MAX_CONFIGURED_SERVICE_BUILDER_CODES) {
    throw new Error(
      `Invalid builder code: at most ${MAX_CONFIGURED_SERVICE_BUILDER_CODES} configured service codes are allowed.`,
    );
  }
  for (const code of codes) {
    assertBuilderCode(code);
  }
  return codes;
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
