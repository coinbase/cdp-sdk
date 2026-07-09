/**
 * @module Accounts
 */

/*
 * Account-scoped shared types, re-exported so they are documented under the
 * Accounts group. Hand-maintained partition of ../_vendor/api/types — if a new
 * type is added to _vendor and belongs to Accounts, add it here (a type absent
 * from every vendored.types.* barrel is dropped from the docs).
 */
export * from "../_vendor/api/types/Account.js";
export * from "../_vendor/api/types/AccountId.js";
export * from "../_vendor/api/types/AccountName.js";
export * from "../_vendor/api/types/AccountType.js";
export * from "../_vendor/api/types/AmountDetail.js";
export * from "../_vendor/api/types/Asset.js";
export * from "../_vendor/api/types/AssetType.js";
export * from "../_vendor/api/types/Balance.js";
export * from "../_vendor/api/types/BalancesAsset.js";
export * from "../_vendor/api/types/Owner.js";

/*
 * Intentionally NOT re-exported (error plumbing, not part of the documented
 * request/response surface): Error_, ErrorType, Url, CapabilityName.
 */
