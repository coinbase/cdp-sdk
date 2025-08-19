/**
 * @module Hash
 */

import { subtle } from "uncrypto";

/**
 * Auth-specific hash function using uncrypto for Edge runtime compatibility.
 * Computes SHA-256 hash of the given data.
 *
 * @param data - The data to hash
 * @returns Promise that resolves to the hex-encoded hash
 */
export const authHash = async (data: Buffer): Promise<string> => {
  const hashBuffer = await subtle.digest("SHA-256", new Uint8Array(data));
  return Buffer.from(hashBuffer).toString("hex");
};
