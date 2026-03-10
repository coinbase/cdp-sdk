// Usage: pnpm tsx evm/smart-accounts/signTypedData.eip6492.ts
//
// Demonstrates EIP-6492 signature wrapping for undeployed smart accounts.
// When a smart account has never sent a user operation, it is not yet deployed on-chain.
// signTypedData automatically wraps the signature with EIP-6492 so that validators
// (e.g. publicClient.verifyTypedData) can verify the signature against the counterfactual account.

import { CdpClient } from "@coinbase/cdp-sdk";
import {
  createPublicClient,
  getAddress,
  http,
  isAddressEqual,
  parseErc6492Signature,
  toHex,
} from "viem";
import { baseSepolia } from "viem/chains";
import "dotenv/config";

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
const PAY_TO = "0x0000000000000000000000000000000000000001" as const;

const authorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

const cdp = new CdpClient();

const owner = await cdp.evm.getOrCreateAccount({ name: "eip6492-example-owner" });
const smartAccount = await cdp.evm.getOrCreateSmartAccount({
  owner,
  name: "eip6492-example-smart",
});
const from = getAddress(smartAccount.address);

console.log("Smart account:", from);

const now = Math.floor(Date.now() / 1000);
const typedData = {
  types: authorizationTypes,
  primaryType: "TransferWithAuthorization" as const,
  domain: {
    name: "USDC",
    version: "2",
    chainId: baseSepolia.id,
    verifyingContract: getAddress(USDC),
  },
  message: {
    from,
    to: getAddress(PAY_TO),
    value: 1000n,
    validAfter: BigInt(now - 600),
    validBefore: BigInt(now + 3600),
    nonce: toHex(crypto.getRandomValues(new Uint8Array(32))),
  },
};

const signature = await smartAccount.signTypedData({
  domain: typedData.domain,
  types: { ...typedData.types },
  primaryType: typedData.primaryType,
  message: { ...typedData.message },
  network: "base-sepolia",
});

const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const bytecode = await publicClient.getCode({ address: from });
const isDeployed = bytecode !== undefined && bytecode !== "0x";

console.log("signature:", signature);

const erc6492 = parseErc6492Signature(signature);
const hasDeploymentInfo =
  erc6492.address &&
  erc6492.data &&
  !isAddressEqual(erc6492.address, "0x0000000000000000000000000000000000000000");

let isValid = false;
try {
  isValid = await publicClient.verifyTypedData({ address: from, ...typedData, signature });
} catch (err) {
  console.error("verifyTypedData error:", err);
}

console.log("isDeployed:", isDeployed);
console.log("hasDeploymentInfo:", hasDeploymentInfo);
console.log("isValid:", isValid);
if (hasDeploymentInfo) {
  console.log("factoryAddress:", erc6492.address);
}
