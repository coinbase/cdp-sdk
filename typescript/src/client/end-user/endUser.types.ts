import type { CreateEndUserBody, ListEndUsersParams } from "../../openapi-client/index.js";

/**
 * The options for validating an access token.
 */
export interface ValidateAccessTokenOptions {
  /**
   * The access token to validate.
   */
  accessToken: string;
}

/**
 * The options for getting an end user.
 */
export interface GetEndUserOptions {
  /**
   * The unique identifier of the end user to retrieve.
   */
  userId: string;
}

/**
 * The options for listing end users.
 */
export type ListEndUsersOptions = ListEndUsersParams;

/**
 * The options for creating an end user.
 */
export type CreateEndUserOptions = CreateEndUserBody;
