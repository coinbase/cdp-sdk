// Usage: pnpm tsx evm/spendPermissions.ts

import { 
    parseEther,
    parseUnits, 
    encodeFunctionData, 
    encodeAbiParameters, 
    createPublicClient,
    createWalletClient,
    http,
    type Address, 
    type Hex 
  } from "viem";
  import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
  import { createBundlerClient, toCoinbaseSmartAccount } from "viem/account-abstraction";
  import { baseSepolia } from "viem/chains";
  import "dotenv/config";
  import { CdpClient } from "@coinbase/cdp-sdk";
  
  const cdp = new CdpClient({
    apiKeyId: "557730ea-e613-4072-a111-7cd26bcd75a7",
    apiKeySecret: "/b0ignBsNZ6UQshvmQXyG0SejTZ8+WCzQfaRzkSVi9NociYj2a/Ctr9bG7SpDL7nLN3yPHIRb9tW3qJmCd08ig==",
    walletSecret: "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgJeO0FLp3FJRFvPUflelGZL7m94gd7jTrua6pMTD/pq+hRANCAATtJxSQNIZUn6c95KK1dsqLWwhKuuv8PT/kHm6HUnli7AQC8V7dTaVYpQWCMY+mcHrjE0zkn1JBdMAOdkM3+Y2C",
    basePath: "http://localhost:8002",
    debugging: true,
  });
  
  // SpendPermissionManager contract configuration
  const SPEND_PERMISSION_MANAGER_ADDRESS = "0xf85210B21cC50302F477BA56686d2019dC9b67Ad" as Address; // Base Sepolia address
  const NETWORK = "base-sepolia";
  
  // SpendPermissionManager ABI (partial - only what we need)
  const spendPermissionManagerAbi = [
    {
        name: "revoke",
        type: "function",
        inputs: [
            {
                name: "spendPermission",
                type: "tuple",
                components: [
                  { name: "account", type: "address" },
                  { name: "spender", type: "address" },
                  { name: "token", type: "address" },
                  { name: "allowance", type: "uint160" },
                  { name: "period", type: "uint48" },
                  { name: "start", type: "uint48" },
                  { name: "end", type: "uint48" },
                  { name: "salt", type: "uint256" },
                  { name: "extraData", type: "bytes" },
                ],
              },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
      name: "approve",
      type: "function",
      inputs: [
        {
          name: "spendPermission",
          type: "tuple",
          components: [
            { name: "account", type: "address" },
            { name: "spender", type: "address" },
            { name: "token", type: "address" },
            { name: "allowance", type: "uint160" },
            { name: "period", type: "uint48" },
            { name: "start", type: "uint48" },
            { name: "end", type: "uint48" },
            { name: "salt", type: "uint256" },
            { name: "extraData", type: "bytes" },
          ],
        },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      name: "approveWithSignature",
      type: "function",
      inputs: [
        {
          name: "spendPermission",
          type: "tuple",
          components: [
            { name: "account", type: "address" },
            { name: "spender", type: "address" },
            { name: "token", type: "address" },
            { name: "allowance", type: "uint160" },
            { name: "period", type: "uint48" },
            { name: "start", type: "uint48" },
            { name: "end", type: "uint48" },
            { name: "salt", type: "uint256" },
            { name: "extraData", type: "bytes" },
          ],
        },
        { name: "signature", type: "bytes" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      name: "spend",
      type: "function",
      inputs: [
        {
          name: "spendPermission",
          type: "tuple",
          components: [
            { name: "account", type: "address" },
            { name: "spender", type: "address" },
            { name: "token", type: "address" },
            { name: "allowance", type: "uint160" },
            { name: "period", type: "uint48" },
            { name: "start", type: "uint48" },
            { name: "end", type: "uint48" },
            { name: "salt", type: "uint256" },
            { name: "extraData", type: "bytes" },
          ],
        },
        { name: "value", type: "uint160" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
  ] as const;
  
  // EIP-712 types for SpendPermission
  const spendPermissionTypes = {
    SpendPermission: [
      { name: "account", type: "address" },
      { name: "spender", type: "address" },
      { name: "token", type: "address" },
      { name: "allowance", type: "uint160" },
      { name: "period", type: "uint48" },
      { name: "start", type: "uint48" },
      { name: "end", type: "uint48" },
      { name: "salt", type: "uint256" },
      { name: "extraData", type: "bytes" },
    ],
  } as const;
  
  async function main() {
    console.log("🚀 Starting Spend Permissions Demo with Pure Viem...\n");
  
    // Create viem clients
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });
  
    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: http(),
    });
  
    // Step 1: Create an owner account using viem
    console.log("Step 1: Creating owner account with viem...");
    // const ownerPrivateKey = generatePrivateKey();
    const ownerAccount = await cdp.evm.createAccount();
    console.log(`✅ Owner account created: ${ownerAccount.address}`);
    // console.log(`   Private key: ${ownerPrivateKey}\n`);
  
    // Step 2: Create a viem smart account
    console.log("Step 2: Creating smart account with viem...");
    const smartAccount = await cdp.evm.createSmartAccount({
      owners: [ownerAccount, {address: SPEND_PERMISSION_MANAGER_ADDRESS}],
    });

    console.log(`✅ Smart account created: ${smartAccount.address}`);
    console.log(`   Type: ${smartAccount.type}`);
    console.log(`   Owner: ${ownerAccount.address}\n`);
  
    // Step 3: Create spender account using viem
    console.log("Step 3: Creating spender account with viem...");
    const spenderPrivateKey = generatePrivateKey();
    const spenderAccount = privateKeyToAccount(spenderPrivateKey);
    console.log(`✅ Spender account created: ${spenderAccount.address}`);
    console.log(`   Private key: ${spenderPrivateKey}\n`);
  
    // Step 4: Fund accounts (manual step)
    await cdp.evm.requestFaucet({
      address: ownerAccount.address,
      network: NETWORK,
      token: "eth",
    });
    await cdp.evm.requestFaucet({
      address: smartAccount.address,
      network: NETWORK,
      token: "eth",
    });
    await cdp.evm.requestFaucet({
      address: spenderAccount.address,
      network: NETWORK,
      token: "eth",
    });
    
    // Wait for user to fund accounts
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Step 5: Define the spend permission
    console.log("Step 5: Defining spend permission...");
    const spendPermission = {
      account: smartAccount.address, // User's smart wallet address
      spender: spenderAccount.address, // App's spender address
      token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address, // ETH (EIP-7528)
      allowance: parseUnits("0.00001", 18), // Small amount for testing
      period: 86400, // 1 day in seconds
      start: 0, // Start immediately
      end: 281474976710655, // Max uint48 (effectively no end)
      salt: 0n, // Unique salt
      extraData: "0x" as Hex, // No extra data
    };
  
    console.log("✅ Spend permission defined:");
    console.log(`   Smart account: ${spendPermission.account}`);
    console.log(`   Spender: ${spendPermission.spender}`);
    console.log(`   Token: ETH`);
    console.log(`   Allowance: 0.00001 ETH`);
    console.log(`   Period: 1 day\n`);
  
    // Step 6: Sign the spend permission using the smart account
    console.log("Step 6: Signing spend permission with smart account...");
    
    try {
      // Step 7: Prepare the transaction data
      console.log("Step 7: Preparing approve transaction...");
  
      const approveWithoutSignatureData = encodeFunctionData({
        abi: spendPermissionManagerAbi,
        functionName: "approve",
        args: [spendPermission],
      });
  
      console.log("📋 TRANSACTION PARAMETERS:");
      console.log("========================");
      console.log(`From: ${spenderAccount.address}`);
      console.log(`To: ${SPEND_PERMISSION_MANAGER_ADDRESS}`);
      console.log(`Data: ${approveWithoutSignatureData}`);
      console.log(`Function selector: ${approveWithoutSignatureData.slice(0, 10)}`);
      console.log(`\nNetwork: Base Sepolia (Chain ID: ${baseSepolia.id})`);
      
      // Step 8: Send the transaction (optional)
      console.log("\n\nStep 8: Send the transaction? (y/n)");
      
      const response = await new Promise<string>(resolve => {
        process.stdin.once('data', data => resolve(data.toString().trim()));
      });
  
      if (response.toLowerCase() === 'y') {
        console.log("\nSending transaction...");
        
        // Add spender account to wallet client
        const spenderWalletClient = createWalletClient({
          account: spenderAccount,
          chain: baseSepolia,
          transport: http(),
        });

        const {userOpHash} = await cdp.evm.sendUserOperation({
          smartAccount,
          network: "base-sepolia",
          calls: [{
            to: SPEND_PERMISSION_MANAGER_ADDRESS,
            data: approveWithoutSignatureData,
            value: parseEther('0')
          }]
        });

        console.log(`✅ Transaction sent: ${userOpHash}`);
        console.log(`   View on Basescan: https://sepolia.basescan.org/tx/${userOpHash}`);

        await new Promise(resolve => setTimeout(resolve, 20000));
        
        // Wait for confirmation
        console.log("\nWaiting for confirmation...");
        const receipt = await cdp.evm.getUserOperation({
          smartAccount,
          userOpHash,
        });

        const revokeData = encodeFunctionData({
          abi: spendPermissionManagerAbi,
          functionName: "revoke",
          args: [spendPermission],
        });

        const {userOpHash: revokeUserOpHash} = await cdp.evm.sendUserOperation({
          smartAccount,
          network: "base-sepolia",
          calls: [{
            to: SPEND_PERMISSION_MANAGER_ADDRESS,
            data: revokeData,
            value: parseEther('0')
          }]
        });

        console.log(`✅ Revoke transaction sent: ${revokeUserOpHash}`);
        console.log(`   View on Basescan: https://sepolia.basescan.org/tx/${revokeUserOpHash}`);

        await new Promise(resolve => setTimeout(resolve, 20000));
        
        // Step 9: Use the spend permission
        console.log("\n\nStep 9: Use the spend permission? (y/n)");
        
        const spendResponse = await new Promise<string>(resolve => {
          process.stdin.once('data', data => resolve(data.toString().trim()));
        });
  
        if (spendResponse.toLowerCase() === 'y') {
          console.log("\nPreparing spend transaction...");
          
          // Define how much to spend
          const spendAmount = parseUnits("0.000001", 18); // 0.000001 ETH (tiny amount for testing)
          
          // Encode the spend function call
          const spendData = encodeFunctionData({
            abi: spendPermissionManagerAbi,
            functionName: "spend",
            args: [spendPermission, spendAmount],
          });
          
          console.log(`\n📋 SPEND TRANSACTION PARAMETERS:`);
          console.log(`================================`);
          console.log(`From: ${spenderAccount.address}`);
          console.log(`To: ${SPEND_PERMISSION_MANAGER_ADDRESS}`);
          console.log(`Spending: ${spendAmount.toString()} wei (0.000001 ETH)`);
          console.log(`From account: ${smartAccount.address}`);
          console.log(`\nData: ${spendData}`);
          console.log(`Function selector: ${spendData.slice(0, 10)}`);
          
          // Check smart account balance first
          const balance = await publicClient.getBalance({ address: smartAccount.address });
          console.log(`\nSmart account balance: ${balance} wei (${Number(balance) / 1e18} ETH)`);
          
          if (balance < spendAmount) {
            console.log("❌ Insufficient balance in smart account!");
            return;
          }
          
          // Send the spend transaction
          console.log("\nSending spend transaction...");
          const spendHash = await spenderWalletClient.sendTransaction({
            to: SPEND_PERMISSION_MANAGER_ADDRESS,
            data: spendData,
            value: 0n, // We're not sending ETH with this tx, we're spending from the permission
          });
          
          console.log(`✅ Spend transaction sent: ${spendHash}`);
          console.log(`   View on Basescan: https://sepolia.basescan.org/tx/${spendHash}`);
          
          // Wait for confirmation
          console.log("\nWaiting for confirmation...");
          const spendReceipt = await publicClient.waitForTransactionReceipt({ hash: spendHash });
          console.log(`✅ Spend transaction confirmed in block ${spendReceipt.blockNumber}`);
          
          // Check new balance
          const newBalance = await publicClient.getBalance({ address: smartAccount.address });
          console.log(`\nSmart account new balance: ${newBalance} wei (${Number(newBalance) / 1e18} ETH)`);
          console.log(`Amount spent: ${balance - newBalance} wei`);
          
          console.log("\n🎉 Successfully used spend permission!");
          console.log("The SpendPermissionManager transferred funds from the smart account.");
        }
      } else {
        console.log("\nTransaction not sent. You can use the data above to test in Tenderly.");
      }
  
    } catch (error) {
      console.error("❌ Error signing:", error);
      console.log("\nNote: The smart account might need to be deployed first.");
      console.log("You can deploy it by sending any transaction from it.");
    }
  }
  
  // Run the demo
  main().catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
  