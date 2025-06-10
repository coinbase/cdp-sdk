import { generateKeyPair, privateDecrypt, constants, createPrivateKey } from "crypto";

/**
 * Generates a new RSA key pair with 4096-bit private key.
 * - Private key in PKCS1 DER format
 * - Public key in PKIX/SPKI DER format
 *
 * @returns A promise that resolves to the generated key pair, or rejects with an error.
 */
export const generateExportEncryptionKeyPair = async () => {
  return await new Promise<{
    publicKey: string;
    privateKey: string;
  }>((resolve, reject) => {
    generateKeyPair(
      "rsa",
      {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: "spki",
          format: "der",
        },
        privateKeyEncoding: {
          type: "pkcs1",
          format: "der",
        },
      },
      (err, publicKey, privateKey) => {
        if (err) {
          reject(err);
        }
        resolve({
          publicKey: publicKey.toString("base64"),
          privateKey: privateKey.toString("base64"),
        });
      },
    );
  });
};

/**
 * Decrypts a ciphertext using RSA-OAEP-SHA256.
 * - Parses PKCS1 private key
 * - Uses RSA-OAEP-SHA256 for decryption
 * - Returns hex-encoded result
 *
 * @param b64PrivateKey - The base64-encoded private key in PKCS1 DER format.
 * @param b64Cipher - The base64-encoded ciphertext.
 * @returns The decrypted key hex string, or throws an error if decryption fails.
 */
export const decryptWithPrivateKey = (b64PrivateKey: string, b64Cipher: string): string => {
  try {
    // Create a private key object from the PKCS1 DER format
    const privateKey = createPrivateKey({
      key: Buffer.from(b64PrivateKey, "base64"),
      format: "der",
      type: "pkcs1",
    });

    const decryptedBuffer = privateDecrypt(
      {
        key: privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(b64Cipher, "base64"),
    );

    return decryptedBuffer.toString("hex");
  } catch (error) {
    throw new Error(`Decryption failed: ${String(error)}`);
  }
};
