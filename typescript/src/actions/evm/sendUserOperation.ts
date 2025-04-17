import { encodeFunctionData } from "viem";

import {
  EvmUserOperationNetwork,
  EvmUserOperationStatus,
  CdpOpenApiClientType,
} from "../../openapi-client";

import type { EvmSmartAccount } from "../../accounts/types";
import type { Calls } from "../../types/calls";
import type { Address, Hex } from "../../types/misc";

/**
 * Options for sending a user operation.
 *
 * @template T - Array type for the calls parameter.
 */
export type SendUserOperationOptions<T extends readonly unknown[]> = {
  /**
   * Array of contract calls to execute in the user operation.
   * Each call can either be:
   * - A direct call with `to`, `value`, and `data`.
   * - A contract call with `to`, `abi`, `functionName`, and `args`.
   *
   * @example
   * ```ts
   * const calls = [
   *   {
   *     to: "0x1234567890123456789012345678901234567890",
   *     value: parseEther("0.0000005"),
   *     data: "0x",
   *   },
   *   {
   *     to: "0x1234567890123456789012345678901234567890",
   *     abi: erc20Abi,
   *     functionName: "transfer",
   *     args: [to, amount],
   *   },
   * ]
   * ```
   */
  calls: Calls<T>;
  /** Chain ID of the network to execute on. */
  network: EvmUserOperationNetwork;
  /** Optional URL of the paymaster service to use for gas sponsorship. Must be ERC-7677 compliant. */
  paymasterUrl?: string;
  /** The idempotency key. */
  idempotencyKey?: string;
};

/**
 * Return type for the sendUserOperation function.
 */
export type SendUserOperationReturnType = {
  /** The address of the smart wallet. */
  smartAccountAddress: Address;
  /** The status of the user operation. */
  status: typeof EvmUserOperationStatus.broadcast;
  /** The hash of the user operation. This is not the transaction hash which is only available after the operation is completed.*/
  userOpHash: Hex;
};

/**
 * Sends a user operation to the network.
 *
 * @example
 * ```ts
 * import { sendUserOperation } from "@coinbase/cdp-sdk";
 * import { parseEther } from "viem";
 * import { CdpClient } from "@coinbase/cdp-sdk";
 *
 * const client = new CdpClient({
 *   apiKeyId: "your-api-key-id",
 *   apiKeySecret: "your-api-key-secret",
 *   walletSecret: "your-wallet-secret",
 * });
 *
 * const ethAccount = await client.createEvmServerAccount()
 * const smartAccount = await client.createEvmSmartAccount({ owner: ethAccount })
 *
 * const result = await sendUserOperation(client, smartAccount, {
 *   calls: [
 *     {
 *       abi: erc20Abi,
 *       functionName: "transfer",
 *       args: [to, amount],
 *     },
 *     {
 *       to: "0x1234567890123456789012345678901234567890",
 *       data: "0x",
 *       value: parseEther("0.0000005"),
 *     },
 *   ],
 *   network: "base-sepolia",
 *   paymasterUrl: "https://api.developer.coinbase.com/rpc/v1/base/someapikey",
 * });
 * ```
 *
 * @param {CdpOpenApiClientType} client - The client to use to send the user operation.
 * @param {EvmSmartAccount} smartAccount - The smart account to send the user operation from.
 * @param {SendUserOperationOptions<T>} options - The options for the user operation.
 * @returns {Promise<SendUserOperationReturnType>} The result of the user operation.
 */
export async function sendUserOperation<T extends readonly unknown[]>(
  client: CdpOpenApiClientType,
  smartAccount: EvmSmartAccount,
  options: SendUserOperationOptions<T>,
): Promise<SendUserOperationReturnType> {
  const { calls, network, paymasterUrl } = options;

  if (calls.length === 0) {
    throw new Error("Calls array is empty");
  }

  const encodedCalls = calls.map(call => {
    const value = (call.value ?? BigInt(0)).toString();

    if ("abi" in call && call.abi && "functionName" in call) {
      return {
        to: call.to,
        data: encodeFunctionData({
          abi: call.abi,
          functionName: call.functionName,
          args: call.args,
        }),
        value,
      };
    }

    return {
      to: call.to,
      data: call.data ?? "0x",
      value,
    };
  });

  const createOpResponse = await client.prepareUserOperation(smartAccount.address, {
    network,
    calls: encodedCalls,
    paymasterUrl,
  });

  const owner = smartAccount.owners[0];

  const signature = await owner.sign({
    hash: createOpResponse.userOpHash as Hex,
  });

  const broadcastResponse = await client.sendUserOperation(
    smartAccount.address,
    createOpResponse.userOpHash as Hex,
    {
      signature,
    },
    options.idempotencyKey,
  );

  return {
    smartAccountAddress: smartAccount.address,
    status: broadcastResponse.status,
    userOpHash: createOpResponse.userOpHash,
  } as SendUserOperationReturnType;
}
