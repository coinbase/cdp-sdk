import { randomUUID } from "crypto";

import {
  type ValidateAccessTokenOptions,
  type ListEndUsersOptions,
  type CreateEndUserOptions,
} from "./endUser.types.js";
import { Analytics } from "../../analytics.js";
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
}
