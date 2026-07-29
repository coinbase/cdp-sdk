/*
 * Shared builder-code validation for the CDP x402 client and server.
 *
 * `@x402/extensions` validates codes when the extension is constructed or
 * declared, which for the client happens on first payment and for the server
 * after wallet provisioning. Validating with the same pattern up front lets
 * both surfaces reject a malformed code before doing any I/O.
 */

import { BUILDER_CODE_PATTERN } from "@x402/extensions/builder-code";

/**
 * Throws when any builder code does not match `^[a-z0-9_]{1,32}$`.
 *
 * @param builderCode - A single builder code or a list of codes to validate.
 */
export function assertValidBuilderCode(builderCode: string | string[]): void {
  const codes = Array.isArray(builderCode) ? builderCode : [builderCode];

  for (const code of codes) {
    if (!BUILDER_CODE_PATTERN.test(code)) {
      throw new Error(
        `Invalid builder code: "${code}". Must be 1-32 characters, lowercase alphanumeric and underscores only.`,
      );
    }
  }
}
