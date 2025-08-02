export { CdpClient } from "./client/cdp.js";
export type { EvmServerAccount, EvmSmartAccount } from "./accounts/evm/types.js";
export type { Policy } from "./policies/types.js";
export {
  CreatePolicyBodySchema,
  UpdatePolicyBodySchema,
  type CreatePolicyBody,
  type UpdatePolicyBody,
} from "./policies/types.js";
export { NetworkError } from "./openapi-client/errors.js";
export type { SpendPermission } from "./spend-permissions/types.js";
export {
  SPEND_PERMISSION_MANAGER_ABI as spendPermissionManagerAbi,
  SPEND_PERMISSION_MANAGER_ADDRESS as spendPermissionManagerAddress,
} from "./spend-permissions/constants.js";

export { parseEther, parseUnits } from "viem";
