import {
  CdpOpenApiClientType,
  EvmEip7702DelegationNetwork,
  EvmEip7702DelegationStatus,
  EvmEip7702DelegationStatusStatus,
} from "../../openapi-client/index.js";
import { wait, WaitOptions } from "../../utils/wait.js";

/**
 * Options for waiting for an EIP-7702 delegation status to become CURRENT.
 */
export type WaitForEvmEip7702DelegationStatusOptions = {
  /** The address of the EVM account. */
  address: string;
  /** The network to query the delegation status on. */
  network: EvmEip7702DelegationNetwork;
  /** Optional options for the wait operation. */
  waitOptions?: WaitOptions;
};

/**
 * Polls getEvmEip7702DelegationStatus until the status is CURRENT or a timeout occurs.
 *
 * @example
 * ```ts
 * import { waitForEvmEip7702DelegationStatus } from "@coinbase/cdp-sdk";
 *
 * const status = await waitForEvmEip7702DelegationStatus(client, {
 *   address: "0x1234567890123456789012345678901234567890",
 *   network: "base-sepolia",
 *   waitOptions: {
 *     timeoutSeconds: 60,
 *   },
 * });
 * ```
 *
 * @param {CdpOpenApiClientType} client - The client to use.
 * @param {WaitForEvmEip7702DelegationStatusOptions} options - The options for the wait operation.
 * @returns {Promise<EvmEip7702DelegationStatus>} The delegation status once it reaches CURRENT.
 */
export async function waitForEvmEip7702DelegationStatus(
  client: CdpOpenApiClientType,
  options: WaitForEvmEip7702DelegationStatusOptions,
): Promise<EvmEip7702DelegationStatus> {
  const { address, network } = options;

  const reload = async () => {
    return client.getEvmEip7702DelegationStatus(address, { network });
  };

  const isTerminal = (delegationStatus: EvmEip7702DelegationStatus): boolean => {
    return delegationStatus.status === EvmEip7702DelegationStatusStatus.CURRENT;
  };

  const waitOptions = options.waitOptions ?? { timeoutSeconds: 60 };

  return await wait(reload, isTerminal, s => s, waitOptions);
}
