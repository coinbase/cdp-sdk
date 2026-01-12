import { randomUUID, publicEncrypt, constants } from "crypto";

import bs58 from "bs58";

import {
  type ValidateAccessTokenOptions,
  type ListEndUsersOptions,
  type CreateEndUserOptions,
  type GetEndUserOptions,
  type ImportEndUserOptions,
} from "./endUser.types.js";
import { Analytics } from "../../analytics.js";
import { ImportAccountPublicRSAKey } from "../../constants.js";
import { UserInputValidationError } from "../../errors.js";
import {
  CdpOpenApiClient,
  type EndUser,
  type ListEndUsers200,
} from "../../openapi-client/index.js";

/**
 * The CDP end user client.
 */
export class CDPEndUserClient {
  /**
   * Creates an end user. An end user is an entity that can own CDP EVM accounts,
   * EVM smart accounts, and/or Solana accounts.
   *
   * @param options - The options for creating an end user.
   *
   * @returns A promise that resolves to the created end user.
   *
   * @example **Create an end user with an email authentication method**
   *          ```ts
   *          const endUser = await cdp.endUser.createEndUser({
   *            authenticationMethods: [
   *              { type: "email", email: "user@example.com" }
   *            ]
   *          });
   *          console.log(endUser.userId);
   *          ```
   *
   * @example **Create an end user with an EVM EOA account**
   *          ```ts
   *          const endUser = await cdp.endUser.createEndUser({
   *            authenticationMethods: [
   *              { type: "email", email: "user@example.com" }
   *            ],
   *            evmAccount: { createSmartAccount: false }
   *          });
   *          ```
   */
  async createEndUser(options: CreateEndUserOptions): Promise<EndUser> {
    Analytics.trackAction({
      action: "create_end_user",
    });

    const userId = options.userId ?? randomUUID();

    return CdpOpenApiClient.createEndUser({
      ...options,
      userId,
    });
  }

  /**
   * Lists end users belonging to the developer's CDP Project.
   * By default, the response is sorted by creation date in ascending order and paginated to 20 users per page.
   *
   * @param options - The options for listing end users.
   *
   * @returns A promise that resolves to a paginated list of end users.
   *
   * @example **List all end users**
   *          ```ts
   *          const result = await cdp.endUsers.listEndUsers();
   *          console.log(result.endUsers);
   *          ```
   *
   * @example **With pagination**
   *          ```ts
   *          let page = await cdp.endUsers.listEndUsers({ pageSize: 10 });
   *
   *          while (page.nextPageToken) {
   *            page = await cdp.endUsers.listEndUsers({
   *              pageSize: 10,
   *              pageToken: page.nextPageToken
   *            });
   *          }
   *          ```
   *
   * @example **With sorting**
   *          ```ts
   *          const result = await cdp.endUsers.listEndUsers({
   *            sort: ['createdAt=desc']
   *          });
   *          ```
   */
  async listEndUsers(options: ListEndUsersOptions = {}): Promise<ListEndUsers200> {
    Analytics.trackAction({
      action: "list_end_users",
    });

    const params = {
      ...options,
      ...(options.sort && { sort: options.sort.join(",") }),
    };

    return CdpOpenApiClient.listEndUsers(params as ListEndUsersOptions);
  }

  /**
   * Gets an end user by their unique identifier.
   *
   * @param options - The options for getting an end user.
   *
   * @returns A promise that resolves to the end user.
   *
   * @example **Get an end user by ID**
   *          ```ts
   *          const endUser = await cdp.endUser.getEndUser({
   *            userId: "user-123"
   *          });
   *          console.log(endUser.userId);
   *          ```
   */
  async getEndUser(options: GetEndUserOptions): Promise<EndUser> {
    Analytics.trackAction({
      action: "get_end_user",
    });

    const { userId } = options;

    return CdpOpenApiClient.getEndUser(userId);
  }

  /**
   * Validates an end user's access token. Throws an error if the access token is invalid.
   *
   * @param options - The options for validating an access token.
   *
   * @returns The end user object if the access token is valid.
   */
  async validateAccessToken(options: ValidateAccessTokenOptions): Promise<EndUser> {
    Analytics.trackAction({
      action: "validate_access_token",
    });

    const { accessToken } = options;

    return CdpOpenApiClient.validateEndUserAccessToken({
      accessToken,
    });
  }

  /**
   * Imports an existing private key for an end user.
   *
   * @param options - The options for importing an end user.
   *
   * @returns A promise that resolves to the imported end user.
   *
   * @example **Import an end user with an EVM private key**
   *          ```ts
   *          const endUser = await cdp.endUser.importEndUser({
   *            authenticationMethods: [
   *              { type: "sms", phoneNumber: "+12055555555" }
   *            ],
   *            privateKey: "0x...",
   *            keyType: "evm"
   *          });
   *          ```
   *
   * @example **Import an end user with a Solana private key (base58)**
   *          ```ts
   *          const endUser = await cdp.endUser.importEndUser({
   *            authenticationMethods: [
   *              { type: "sms", phoneNumber: "+12055555555" }
   *            ],
   *            privateKey: "3Kzj...",
   *            keyType: "solana"
   *          });
   *          ```
   */
  async importEndUser(options: ImportEndUserOptions): Promise<EndUser> {
    Analytics.trackAction({
      action: "import_end_user",
    });

    const userId = options.userId ?? randomUUID();

    let privateKeyBytes: Uint8Array;

    if (options.keyType === "evm") {
      // EVM: expect hex string (with or without 0x prefix)
      if (typeof options.privateKey !== "string") {
        throw new UserInputValidationError("EVM private key must be a hex string");
      }
      const privateKeyHex = options.privateKey.startsWith("0x")
        ? options.privateKey.slice(2)
        : options.privateKey;

      if (!/^[0-9a-fA-F]+$/.test(privateKeyHex)) {
        throw new UserInputValidationError("Private key must be a valid hexadecimal string");
      }

      privateKeyBytes = Buffer.from(privateKeyHex, "hex");
    } else {
      // Solana: expect base58 string or raw bytes (32 or 64 bytes)
      if (typeof options.privateKey === "string") {
        privateKeyBytes = bs58.decode(options.privateKey);
      } else {
        privateKeyBytes = options.privateKey;
      }

      if (privateKeyBytes.length !== 32 && privateKeyBytes.length !== 64) {
        throw new UserInputValidationError("Invalid Solana private key length");
      }

      // Truncate 64-byte keys to 32 bytes (seed only)
      if (privateKeyBytes.length === 64) {
        privateKeyBytes = privateKeyBytes.subarray(0, 32);
      }
    }

    const encryptedPrivateKey = publicEncrypt(
      {
        key: options.encryptionPublicKey ?? ImportAccountPublicRSAKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      privateKeyBytes,
    );

    return CdpOpenApiClient.importEndUser({
      userId,
      authenticationMethods: options.authenticationMethods,
      encryptedPrivateKey: encryptedPrivateKey.toString("base64"),
      keyType: options.keyType,
    });
  }
}
