import { createHash } from "crypto";

/**
 * Deterministically generates a UUIDv4 from a given input string.
 * This is necessary when we need to generate downstream idempotency keys for operations that have multiple calls.
 *
 * @param input - The input string to derive from
 * @param salt - Optional salt to append to the input (defaults to "salt")
 * @returns A UUIDv4 formatted string
 */
export function createDeterministicUuidV4(input: string, salt = "salt"): string {
  const hash = createHash("sha256")
    .update(input + "-" + salt)
    .digest("hex");
  // Format as UUIDv4: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16), // Version 4
    ((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // Variant bits
    hash.slice(20, 32),
  ].join("-");
}
