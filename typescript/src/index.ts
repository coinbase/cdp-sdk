export { CdpClient } from "./client/cdp.js";
export type { EvmServerAccount, EvmSmartAccount } from "./accounts/evm/types.js";
export type { Policy } from "./policies/types.js";
export {
  CreatePolicyBodySchema,
  UpdatePolicyBodySchema,
  type CreatePolicyBody,
  type UpdatePolicyBody,
} from "./policies/schema.js";
export { NetworkError } from "./openapi-client/errors.js";
export type { SpendPermission } from "./spend-permissions/types.js";

export { parseEther, parseUnits } from "viem";
