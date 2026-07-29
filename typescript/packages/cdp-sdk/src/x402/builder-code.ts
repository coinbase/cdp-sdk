/*
 * Validation helpers for the x402 builder-code extension.
 *
 * Upstream validates codes with `BUILDER_CODE_PATTERN.test()`, which coerces its
 * argument — `42` and `["my_app"]` both stringify into something the pattern
 * accepts. Config values reaching the SDK are not always typed (a `configPath`
 * file is untyped JSON), so the type is checked here before the pattern runs.
 */

import { BUILDER_CODE_PATTERN } from "@x402/extensions/builder-code";

/** Shared tail of every builder-code rejection message. */
const CODE_REQUIREMENT =
  "Must be a string of 1-32 characters, lowercase alphanumeric and underscores only.";

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
