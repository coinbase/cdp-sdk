// Usage: pnpm tsx evm/eip7702/reDelegateEip7702.ts
//
// EIP-7702 Re-Delegation Example
//
// This script demonstrates:
// 1. Initial delegation using CDP SDK's createEvmEip7702Delegation
// 2. Re-delegation to a DIFFERENT proxy address using raw viem
//
// This shows the flexibility of EIP-7702 where an EOA can change its delegation
// target by sending a new type-4 transaction with a different authorization.

import {
  createWalletClient,
  createPublicClient,
  http,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

// ============================================================================
// Contract Addresses (Base Sepolia)
// ============================================================================

// CDP SDK's default proxy (used in step 1)
export const CDP_DEFAULT_PROXY = "0x7702cb554e6bFb442cb743A7dF23154544a7176C" as const;

// Alternative proxy for re-delegation (used in step 2)
// Using a different EIP-7702 proxy implementation
export const ALTERNATIVE_PROXY_ADDRESS = "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B" as const;

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  console.log("=".repeat(70));
  console.log("EIP-7702 RE-DELEGATION DEMO");
  console.log("=".repeat(70));

  // =========================================================================
  // SETUP
  // =========================================================================
  console.log("\n[SETUP] Initializing accounts and clients...\n");

  const cdp = new CdpClient();
  console.log("CDP Client initialized");

  const cdpAccount = await cdp.evm.getOrCreateAccount({
    name: `redelegation-demo-10`,
  });
  console.log("CDP Account created:", cdpAccount.address);

  const exportedPrivateKey = await cdp.evm.exportAccount({
    address: cdpAccount.address,
  });
  const privateKey = `0x${exportedPrivateKey}` as Hex;
  const eoa = privateKeyToAccount(privateKey);
  console.log("EOA address:", eoa.address);

  const rpcUrl = "https://sepolia.base.org";
  const walletClient = createWalletClient({
    account: eoa,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  // Request faucet funds
  console.log("\nRequesting faucet funds...");
  try {
    const faucetResult = await cdp.evm.requestFaucet({
      address: cdpAccount.address,
      network: "base-sepolia",
      token: "eth",
    });
    console.log("  Faucet tx:", faucetResult.transactionHash);
    await publicClient.waitForTransactionReceipt({
      hash: faucetResult.transactionHash,
    });
    console.log("  Faucet confirmed!");
  } catch (error) {
    console.log("  Note:", (error as Error).message?.slice(0, 80));
  }

  const balance = await publicClient.getBalance({ address: eoa.address });
  console.log("  Balance:", Number(balance) / 1e18, "ETH");

  // Check initial state
  const initialCode = await publicClient.getCode({ address: eoa.address });
  const initialNonce = await publicClient.getTransactionCount({ address: eoa.address });
  console.log("\nInitial state:");
  console.log("  Code:", initialCode || "(no code - standard EOA)");
  console.log("  Nonce:", initialNonce);

  // =========================================================================
  // STEP 1: INITIAL DELEGATION USING CDP SDK
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("STEP 1: INITIAL DELEGATION (CDP SDK)");
  console.log("=".repeat(70));

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log("\n[1.1] Creating EIP-7702 delegation with CDP SDK...");
  const { delegationOperationId } = await cdp.evm.createEvmEip7702Delegation(
    cdpAccount.address,
    {
      network: "base-sepolia",
      enableSpendPermissions: true,
    },
  );

  console.log("  Delegation operation created:", delegationOperationId);
  await new Promise(resolve => setTimeout(resolve, 10000));

  // console.log("\n[1.2] Waiting for delegation to complete...");
  // const delegationOperation = await cdp.evm.waitForEvmEip7702DelegationOperationStatus({
  //   delegationOperationId,
  // });

  // console.log("  Status:", delegationOperation.status);
  // if (delegationOperation.transactionHash) {
  //   console.log("  Transaction hash:", delegationOperation.transactionHash);
  //   console.log("  BaseScan:", `https://sepolia.basescan.org/tx/${delegationOperation.transactionHash}`);
  // }
  // if (delegationOperation.delegateAddress) {
  //   console.log("  Delegate address:", delegationOperation.delegateAddress);
  // }

  const afterFirstDelegation = await publicClient.getCode({ address: eoa.address });
  const firstDelegationWorked = afterFirstDelegation && afterFirstDelegation.startsWith("0xef0100");

  if (firstDelegationWorked) {
    console.log("  First delegation successful!");
    console.log("  Delegation code:", afterFirstDelegation);
  } else {
    console.log("  First delegation may not have completed yet");
    console.log("  Waiting a bit more...");
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  // =========================================================================
  // STEP 2: RE-DELEGATION TO DIFFERENT PROXY (MANUAL VIEM)
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("STEP 2: RE-DELEGATION TO DIFFERENT PROXY (Manual viem)");
  console.log("=".repeat(70));
  console.log("\nNote: Delegating to a DIFFERENT proxy contract address.");
  console.log("Old proxy:", CDP_DEFAULT_PROXY);
  console.log("New proxy:", ALTERNATIVE_PROXY_ADDRESS);

  console.log("\n[2.1] Creating new EIP-7702 authorization...");
  console.log("  Target proxy:", ALTERNATIVE_PROXY_ADDRESS);

  // Get current nonce for authorization
  // CRITICAL: When EOA is both sender AND authority, auth nonce = currentNonce + 1
  const currentNonce = await publicClient.getTransactionCount({ address: eoa.address });
  const authNonce = currentNonce + 1;
  console.log("  Current nonce:", currentNonce);
  console.log("  Auth nonce (current + 1):", authNonce);

  const authorization = await walletClient.signAuthorization({
    account: eoa,
    contractAddress: ALTERNATIVE_PROXY_ADDRESS,
    nonce: authNonce,
  });

  console.log("  Authorization signed:");
  console.log("    - address:", authorization.address);
  console.log("    - chainId:", authorization.chainId);
  console.log("    - nonce:", authorization.nonce);

  // For re-delegation to a DIFFERENT proxy, we send a simple transaction
  // with the new authorization. We don't need setImplementation since
  // the new proxy will have its own initialization logic.
  console.log("\n[2.2] Sending simple re-delegation transaction...");
  console.log("  Strategy: Empty transaction with new authorization list");
  console.log("  This changes the delegation target to the new proxy");

  const reDelegationTxHash = await walletClient.sendTransaction({
    account: eoa,
    to: eoa.address,
    value: 0n,
    data: "0x", // Empty data - just activating the new delegation
    authorizationList: [authorization],
  });

  console.log("  Transaction hash:", reDelegationTxHash);
  console.log("  BaseScan:", `https://sepolia.basescan.org/tx/${reDelegationTxHash}`);

  console.log("\n[2.3] Waiting for confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash: reDelegationTxHash });
  console.log("  Status:", receipt.status === "success" ? "SUCCESS" : "FAILED");
  console.log("  Gas used:", receipt.gasUsed.toString());

  await new Promise((r) => setTimeout(r, 2000));

  // =========================================================================
  // VERIFICATION
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("VERIFICATION");
  console.log("=".repeat(70));

  const finalCode = await publicClient.getCode({ address: eoa.address });
  const delegationWorked = finalCode && finalCode.startsWith("0xef0100");

  console.log("\n[3.1] Final delegation code:");
  if (delegationWorked) {
    console.log("  Delegation code detected");
    console.log("  Code:", finalCode);

    // Extract the delegated address from the code
    // EIP-7702 format: 0xef0100 + <20 bytes address>
    const delegatedAddress = `0x${finalCode.slice(6, 46)}` as Address;
    console.log("  Delegated to:", delegatedAddress);

    if (delegatedAddress.toLowerCase() === ALTERNATIVE_PROXY_ADDRESS.toLowerCase()) {
      console.log("  Correctly delegated to new proxy!");
    } else if (delegatedAddress.toLowerCase() === CDP_DEFAULT_PROXY.toLowerCase()) {
      console.log("  Still delegated to old proxy (may need more time)");
    } else {
      console.log("  Delegated to unexpected address");
    }
  } else {
    console.log("  No delegation code");
  }

  console.log("\n[3.2] Delegation change verification:");
  console.log("  Old proxy (Step 1):", CDP_DEFAULT_PROXY);
  console.log("  New proxy (Step 2):", ALTERNATIVE_PROXY_ADDRESS);
  console.log("  Current delegation:", delegationWorked ? `0x${finalCode!.slice(6, 46)}` : "None");

  console.log("\n" + "=".repeat(70));
  console.log("RE-DELEGATION COMPLETE!");
  console.log("=".repeat(70));
  console.log("\nSummary:");
  console.log("  EOA Address:", eoa.address);
  console.log("  Step 1: CDP SDK -> ", CDP_DEFAULT_PROXY, "(initialized)");
  console.log("  Step 2: Manual viem -> ", ALTERNATIVE_PROXY_ADDRESS, "(fresh state)");
  console.log("\nKey Insights:");
  console.log("  1. EIP-7702 allows EOAs to freely change delegation targets");
  console.log("  2. Storage persists across re-delegations (code changes, state stays)");
  console.log("  3. You can re-delegate to any proxy using manual viem authorization");
  console.log("\nNote on re-delegating back to CDP proxy:");
  console.log("  - CDP's createEvmEip7702Delegation always calls initialize()");
  console.log("  - This will revert if the proxy was already initialized");
  console.log("  - For re-delegation back, use manual viem without initialize()");
  console.log("  - See example code in Step 2 - same pattern applies!");
}

main().catch(console.error);
