import { encodeAbiParameters, encodeFunctionData, serializeErc6492Signature } from "viem";

import type { Address, Hex } from "../../types/misc.js";
import type { PublicClient } from "viem";

const COINBASE_SMART_WALLET_FACTORY = "0xBA5ED110eFDBa3D005bfC882d75358ACBbB85842";

const COINBASE_SMART_WALLET_FACTORY_ABI = [
  {
    name: "createAccount",
    type: "function",
    inputs: [
      { name: "owners", type: "bytes[]" },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [{ name: "account", type: "address" }],
    stateMutability: "payable",
  },
] as const;

/**
 * Wraps a smart account signature with EIP-6492 deployment data if the account is not yet deployed.
 *
 * For undeployed (counterfactual) Coinbase Smart Wallet accounts, validators cannot call
 * `isValidSignature` on-chain. EIP-6492 embeds the factory address and calldata so that
 * validators can simulate deployment before verifying the signature.
 *
 * @param publicClient - A viem public client used to check the account bytecode.
 * @param accountAddress - The smart account address to check deployment status.
 * @param ownerAddress - The owner address used as the factory `createAccount` argument.
 * @param signature - The inner ERC-1271 signature to wrap.
 * @returns The original signature if the account is deployed, or an EIP-6492 wrapped signature otherwise.
 */
export async function wrapSignatureWithEip6492IfUndeployed(
  publicClient: PublicClient,
  accountAddress: Address,
  ownerAddress: Address,
  signature: Hex,
): Promise<Hex> {
  const bytecode = await publicClient.getCode({ address: accountAddress });
  const isDeployed = bytecode !== undefined && bytecode !== "0x";

  if (!isDeployed) {
    const ownerBytes = encodeAbiParameters([{ type: "address" }], [ownerAddress]);

    const factoryCalldata = encodeFunctionData({
      abi: COINBASE_SMART_WALLET_FACTORY_ABI,
      functionName: "createAccount",
      args: [[ownerBytes], 0n],
    });

    return serializeErc6492Signature({
      address: COINBASE_SMART_WALLET_FACTORY,
      data: factoryCalldata,
      signature,
    });
  }

  return signature;
}
