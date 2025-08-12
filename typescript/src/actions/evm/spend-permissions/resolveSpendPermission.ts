import { UserInputValidationError } from "../../../errors.js";
import { resolveTokenAddress } from "../../../spend-permissions/utils.js";

import type { SpendPermissionNetwork } from "../../../openapi-client/index.js";
import type { SpendPermission, SpendPermissionInput } from "../../../spend-permissions/types.js";

/**
 * Generate a random salt using crypto.getRandomValues().
 *
 * @returns A random bigint salt.
 */
function generateRandomSalt(): bigint {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  // Convert bytes to bigint
  let result = 0n;
  for (let i = 0; i < randomBytes.length; i++) {
    result = (result << 8n) + BigInt(randomBytes[i]);
  }

  return result;
}

/**
 * Resolve a spend permission input to a spend permission.
 *
 * @param spendPermissionInput - The spend permission input to resolve.
 * @param network - The network to resolve the spend permission for.
 *
 * @returns The resolved spend permission.
 */
export function resolveSpendPermission(
  spendPermissionInput: SpendPermissionInput,
  network: SpendPermissionNetwork,
): SpendPermission {
  // Validate that either period or periodInDays is provided, but not both
  if (
    spendPermissionInput.period !== undefined &&
    spendPermissionInput.periodInDays !== undefined
  ) {
    throw new UserInputValidationError(
      "Cannot specify both 'period' and 'periodInDays'. Please provide only one.",
    );
  }

  if (
    spendPermissionInput.period === undefined &&
    spendPermissionInput.periodInDays === undefined
  ) {
    throw new UserInputValidationError(
      "Must specify either 'period' (in seconds) or 'periodInDays'.",
    );
  }

  // Convert periodInDays to period in seconds if provided
  const period = spendPermissionInput.period ?? spendPermissionInput.periodInDays! * 24 * 60 * 60;

  // Set defaults for start and end
  const now = new Date();
  const startDate = spendPermissionInput.start ?? now;

  /*
   * For end date default, we need to handle the max uint48 value carefully
   * JavaScript Date max is around year 275760, but uint48 max (281474976710655) is much larger
   * So we'll use the max uint48 value directly for end if no end date is provided
   */
  const endDate = spendPermissionInput.end;

  // Convert Date objects to seconds since epoch for the contract
  const start = Math.floor(startDate.getTime() / 1000);
  const end = endDate ? Math.floor(endDate.getTime() / 1000) : 281474976710655; // Max uint48 value (never expires)

  const { periodInDays: _periodInDays, ...inputWithoutPeriodInDays } = spendPermissionInput;

  return {
    ...inputWithoutPeriodInDays,
    token: resolveTokenAddress(spendPermissionInput.token, network),
    period,
    start,
    end,
    salt: spendPermissionInput.salt ?? generateRandomSalt(),
    extraData: spendPermissionInput.extraData ?? "0x",
  };
}
