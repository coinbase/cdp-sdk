import { type ValidateAccessTokenOptions } from "./endUser.types.js";
import { Analytics } from "../../analytics.js";
import { CdpOpenApiClient, type EndUser } from "../../openapi-client/index.js";

/**
 * The CDP end user client.
 */
export class CDPEndUserClient {
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
