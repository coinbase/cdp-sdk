import * as crypto from "crypto";
import { createPrivateKey } from "crypto";

import { SignJWT, importPKCS8, importJWK, JWTPayload } from "jose";

import { InvalidWalletSecretFormatError, UndefinedWalletSecretError } from "../errors";

/**
 * JwtOptions contains configuration for JWT generation.
 *
 * This interface holds all necessary parameters for generating a JWT token
 * for authenticating with Coinbase's REST APIs. It supports both EC (ES256)
 * and Ed25519 (EdDSA) keys.
 */
export interface JwtOptions {
  /**
   * The API key ID
   *
   * Examples:
   *  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
   *  'organizations/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/apiKeys/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
   */
  apiKeyId: string;

  /**
   * The API key secret
   *
   * Examples:
   *  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==' (Edwards key (Ed25519))
   *  '-----BEGIN EC PRIVATE KEY-----\n...\n...\n...==\n-----END EC PRIVATE KEY-----\n' (EC key (ES256))
   */
  apiKeySecret: string;

  /**
   * The HTTP method for the request (e.g. 'GET', 'POST')
   */
  requestMethod: string;

  /**
   * The host for the request (e.g. 'api.cdp.coinbase.com')
   */
  requestHost: string;

  /**
   * The path for the request (e.g. '/platform/v1/wallets')
   */
  requestPath: string;

  /**
   * Optional expiration time in seconds (defaults to 120)
   */
  expiresIn?: number;
}

/**
 * WalletJwtOptions contains configuration for Wallet Auth JWT generation.
 *
 * This interface holds all necessary parameters for generating a Wallet Auth JWT
 * for authenticating with endpoints that require wallet authentication.
 */
export interface WalletJwtOptions {
  /**
   * - The Wallet Secret
   */
  walletSecret: string;

  /**
   * - The HTTP method for the request (e.g. 'GET', 'POST')
   */
  requestMethod: string;

  /**
   * - The host for the request (e.g. 'api.cdp.coinbase.com')
   */
  requestHost: string;

  /**
   * - The path for the request (e.g. '/platform/v1/wallets/{wallet_id}/addresses')
   */
  requestPath: string;

  /**
   * - The request data for the request (e.g. { "wallet_id": "1234567890" })
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestData: Record<string, any>;
}

/**
 * Generates a JWT (also known as a Bearer token) for authenticating with Coinbase's REST APIs.
 * Supports both EC (ES256) and Ed25519 (EdDSA) keys.
 *
 * @param options - The configuration options for generating the JWT
 * @returns The generated JWT (Bearer token) string
 * @throws {Error} If required parameters are missing, invalid, or if JWT signing fails
 */
export async function generateJwt(options: JwtOptions): Promise<string> {
  // Validate required parameters
  if (!options.apiKeyId) {
    throw new Error("Key name is required");
  }
  if (!options.apiKeySecret) {
    throw new Error("Private key is required");
  }
  if (!options.requestMethod || !options.requestHost || !options.requestPath) {
    throw new Error("Request details (method, host, path) are required");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresIn || 120; // Default to 120 seconds if not specified
  const uri = `${options.requestMethod} ${options.requestHost}${options.requestPath}`;

  // Prepare the JWT payload
  const claims = {
    sub: options.apiKeyId,
    iss: "cdp",
    aud: ["cdp_service"],
    uris: [uri],
  };

  // Generate random nonce for the header
  const randomNonce = nonce();

  // Determine if we're using EC or Edwards key based on the key format
  if (isValidECKey(options.apiKeySecret)) {
    return await buildECJWT(
      options.apiKeySecret,
      options.apiKeyId,
      claims,
      now,
      expiresIn,
      randomNonce,
    );
  } else if (isValidEd25519Key(options.apiKeySecret)) {
    return await buildEdwardsJWT(
      options.apiKeySecret,
      options.apiKeyId,
      claims,
      now,
      expiresIn,
      randomNonce,
    );
  } else {
    throw new Error("Invalid key format - must be either PEM EC key or base64 Ed25519 key");
  }
}

/**
 * Generates a wallet authentication JWT for the given API endpoint URL.
 * Used for authenticating with specific endpoints that require wallet authentication.
 *
 * @param options - The configuration options for generating the JWT
 * @returns The generated JWT (Bearer token) string
 * @throws {UndefinedWalletSecretError} If the Wallet Secret is not defined.
 * @throws {InvalidWalletSecretFormatError} If the private key is not in the correct format or signing fails.
 */
export async function generateWalletJwt(options: WalletJwtOptions): Promise<string> {
  if (!options.walletSecret) {
    throw new UndefinedWalletSecretError("Wallet Secret is not defined");
  }

  const uri = `${options.requestMethod} ${options.requestHost}${options.requestPath}`;
  const now = Math.floor(Date.now() / 1000);

  const claims: JWTPayload = {
    uris: [uri],
  };

  if (Object.keys(options.requestData).length > 0) {
    claims.req = options.requestData;
  }

  try {
    const ecKey = createPrivateKey({
      key: options.walletSecret,
      format: "der",
      type: "pkcs8",
      encoding: "base64",
    });

    return await new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", typ: "JWT" })
      .setIssuedAt(now)
      .setNotBefore(now)
      .setJti(nonce())
      .sign(ecKey);
  } catch (error) {
    throw new InvalidWalletSecretFormatError("Could not create the EC key: " + error);
  }
}

/**
 * Determines if a string could be a valid Ed25519 key
 *
 * @param str - The string to test
 * @returns True if the string could be a valid Ed25519 key, false otherwise
 */
function isValidEd25519Key(str: string): boolean {
  try {
    const decoded = Buffer.from(str, "base64");
    return decoded.length === 64;
  } catch {
    return false;
  }
}

/**
 * Determines if a string is a valid EC private key in PEM format
 *
 * @param str - The string to test
 * @returns True if the string is a valid EC private key in PEM format
 */
function isValidECKey(str: string): boolean {
  try {
    // Attempt to create a private key object - will throw if invalid
    const key = createPrivateKey(str);
    // Check if it's an EC key by examining its asymmetric key type
    return key.asymmetricKeyType === "ec";
  } catch {
    return false;
  }
}

/**
 * Builds a JWT using an EC key.
 *
 * @param privateKey - The EC private key in PEM format
 * @param keyName - The key name/ID
 * @param claims - The JWT claims
 * @param now - Current timestamp in seconds
 * @param expiresIn - Number of seconds until the token expires
 * @param nonce - Random nonce for the JWT header
 * @returns A JWT token signed with an EC key
 * @throws {Error} If key conversion, import, or signing fails
 */
async function buildECJWT(
  privateKey: string,
  keyName: string,
  claims: JWTPayload,
  now: number,
  expiresIn: number,
  nonce: string,
): Promise<string> {
  try {
    // Convert to PKCS8 format
    const keyObj = createPrivateKey(privateKey);
    const pkcs8Key = keyObj.export({ type: "pkcs8", format: "pem" }).toString();

    // Import the key for signing
    const ecKey = await importPKCS8(pkcs8Key, "ES256");

    // Sign and return the JWT
    return await new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid: keyName, typ: "JWT", nonce })
      .setIssuedAt(Math.floor(now))
      .setNotBefore(Math.floor(now))
      .setExpirationTime(Math.floor(now + expiresIn))
      .sign(ecKey);
  } catch (error) {
    throw new Error(`Failed to generate EC JWT: ${(error as Error).message}`);
  }
}

/**
 * Builds a JWT using an Ed25519 key.
 *
 * @param privateKey - The Ed25519 private key in base64 format
 * @param keyName - The key name/ID
 * @param claims - The JWT claims
 * @param now - Current timestamp in seconds
 * @param expiresIn - Number of seconds until the token expires
 * @param nonce - Random nonce for the JWT header
 * @returns A JWT token using an Ed25519 key
 * @throws {Error} If key parsing, import, or signing fails
 */
async function buildEdwardsJWT(
  privateKey: string,
  keyName: string,
  claims: JWTPayload,
  now: number,
  expiresIn: number,
  nonce: string,
): Promise<string> {
  try {
    // Decode the base64 key (expecting 64 bytes: 32 for seed + 32 for public key)
    const decoded = Buffer.from(privateKey, "base64");
    if (decoded.length !== 64) {
      throw new Error("Invalid Ed25519 key length");
    }

    const seed = decoded.subarray(0, 32);
    const publicKey = decoded.subarray(32);

    // Create JWK from the key components
    const jwk = {
      kty: "OKP",
      crv: "Ed25519",
      d: seed.toString("base64url"),
      x: publicKey.toString("base64url"),
    };

    // Import the key for signing
    const key = await importJWK(jwk, "EdDSA");

    // Sign and return the JWT
    return await new SignJWT(claims)
      .setProtectedHeader({ alg: "EdDSA", kid: keyName, typ: "JWT", nonce })
      .setIssuedAt(Math.floor(now))
      .setNotBefore(Math.floor(now))
      .setExpirationTime(Math.floor(now + expiresIn))
      .sign(key);
  } catch (error) {
    throw new Error(`Failed to generate Ed25519 JWT: ${(error as Error).message}`);
  }
}

/**
 * Generates a random nonce for the JWT.
 *
 * @returns {string} The generated nonce.
 */
function nonce(): string {
  return crypto.randomBytes(16).toString("hex");
}
