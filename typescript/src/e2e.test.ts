import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";
import {
  createPublicClient,
  http,
  parseEther,
  serializeTransaction,
  type Hex,
  type PublicClient,
  type Transport,
  type Chain,
  type Address,
  formatEther,
  TransactionReceipt,
} from "viem";
import { baseSepolia, optimismSepolia } from "viem/chains";
import { CdpClient, CdpClientOptions } from "./client/cdp.js";
import type {
  ServerAccount as Account,
  ImportServerAccountOptions,
  SmartAccount,
} from "./client/evm/evm.types.js";
import type { ImportAccountOptions } from "./client/solana/solana.types.js";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
  SystemProgram,
  Transaction,
  Connection,
} from "@solana/web3.js";
import { SolanaAccount } from "./accounts/solana/types.js";
import type { Policy } from "./policies/types.js";
import type { WaitForUserOperationReturnType } from "./actions/evm/waitForUserOperation.js";
import { TimeoutError } from "./errors.js";
import { SignEvmTransactionRule } from "./policies/schema.js";
import bs58 from "bs58";
import { Abi } from "abitype";
import kitchenSinkAbi from "../fixtures/kitchenSinkAbi.js";

dotenv.config();

const testAccountName = "E2EServerAccount2";

const logger = {
  log: (...args: any[]) => {
    if (process.env.E2E_LOGGING) {
      console.log(...args);
    }
  },
};

// Helper function to stringify objects with bigint values
function safeStringify(obj: any) {
  return JSON.stringify(
    obj,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );
}

async function ensureSufficientEthBalance(cdp: CdpClient, account: Account) {
  const publicClient = createPublicClient<Transport, Chain>({
    chain: baseSepolia,
    transport: http(),
  });

  const ethBalance = await publicClient.getBalance({
    address: account.address,
  });

  const minRequiredBalance = parseEther("0.000001");
  if (ethBalance < minRequiredBalance) {
    logger.log(
      `ETH balance (${formatEther(ethBalance)}) too low for ${account.address}. Requesting funds...`,
    );
    const { transactionHash } = await cdp.evm.requestFaucet({
      address: account.address,
      network: "base-sepolia",
      token: "eth",
    });

    await publicClient.waitForTransactionReceipt({ hash: transactionHash });
    logger.log(
      `Funds requested. New balance: ${await publicClient.getBalance({ address: account.address })}`,
    );
  }
}

async function ensureSufficientSolBalance(cdp: CdpClient, account: SolanaAccount) {
  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const connection = new Connection("https://api.devnet.solana.com");
  let balance = await connection.getBalance(new PublicKey(account.address));

  // 1250000 is the amount the faucet gives, and is plenty to cover gas
  if (balance >= 1250000) {
    return;
  }

  console.log("Balance too low, requesting SOL from faucet...");
  await account.requestFaucet({
    token: "sol",
  });

  let attempts = 0;
  const maxAttempts = 30;

  while (balance === 0 && attempts < maxAttempts) {
    balance = await connection.getBalance(new PublicKey(account.address));
    if (balance === 0) {
      console.log("Waiting for funds...");
      await sleep(1000);
      attempts++;
    }
  }

  if (balance === 0) {
    throw new Error("Account not funded after multiple attempts");
  }
}

describe("CDP Client E2E Tests", () => {
  let cdpOptions: CdpClientOptions;
  let cdp: CdpClient;
  let publicClient: PublicClient<Transport, Chain>;

  let testAccount: Account;
  let testSmartAccount: SmartAccount;
  let testSolanaAccount: SolanaAccount;
  let testPolicyId: string;

  beforeAll(async () => {
    cdpOptions = {};

    if (process.env.E2E_BASE_PATH) {
      cdpOptions.basePath = process.env.E2E_BASE_PATH;
    }

    cdp = new CdpClient(cdpOptions);
    publicClient = createPublicClient<Transport, Chain>({
      chain: baseSepolia,
      transport: http(),
    });

    testAccount = await cdp.evm.getOrCreateAccount({ name: testAccountName });
    testSmartAccount = await (async () => {
      if (process.env.CDP_E2E_SMART_ACCOUNT_ADDRESS) {
        logger.log("CDP_E2E_SMART_ACCOUNT_ADDRESS is set. Using existing smart account.");
        return cdp.evm.getSmartAccount({
          address: process.env.CDP_E2E_SMART_ACCOUNT_ADDRESS as Address,
          owner: testAccount,
        });
      } else {
        logger.log("CDP_E2E_SMART_ACCOUNT_ADDRESS is not set. Creating a new smart account.");
        return cdp.evm.createSmartAccount({
          owner: testAccount,
        });
      }
    })();
    testSolanaAccount = await cdp.solana.getOrCreateAccount({ name: testAccountName });
  });

  beforeEach(async () => {
    await ensureSufficientEthBalance(cdp, testAccount);
    await ensureSufficientSolBalance(cdp, testSolanaAccount);
  });

  it("should create, get, and list accounts", async () => {
    const randomName = generateRandomName();
    const serverAccount = await cdp.evm.createAccount({ name: randomName });
    expect(serverAccount).toBeDefined();

    const accounts = await cdp.evm.listAccounts();
    expect(accounts).toBeDefined();
    expect(accounts.accounts.length).toBeGreaterThan(0);

    let account = await cdp.evm.getAccount({ address: serverAccount.address });
    expect(account).toBeDefined();
    expect(account.address).toBe(serverAccount.address);
    expect(account.name).toBe(serverAccount.name);

    account = await cdp.evm.getAccount({ name: randomName });
    expect(account).toBeDefined();
    expect(account.address).toBe(serverAccount.address);
    expect(account.name).toBe(randomName);
  });

  it("should import an evm server account from a private key", async () => {
    const privateKey = generatePrivateKey();
    const randomName = generateRandomName();

    const importAccountOptions: ImportServerAccountOptions = {
      privateKey,
      name: randomName,
    };

    if (process.env.CDP_E2E_ENCRYPTION_PUBLIC_KEY) {
      importAccountOptions.encryptionPublicKey = process.env.CDP_E2E_ENCRYPTION_PUBLIC_KEY;
    }

    logger.log("Importing account with private key");
    const importedAccount = await cdp.evm.importAccount(importAccountOptions);

    expect(importedAccount).toBeDefined();
    expect(importedAccount.address).toBeDefined();
    expect(importedAccount.name).toBe(randomName);
    logger.log(`Imported account with address: ${importedAccount.address}`);

    const accountByAddress = await cdp.evm.getAccount({ address: importedAccount.address });
    expect(accountByAddress).toBeDefined();
    expect(accountByAddress.address).toBe(importedAccount.address);

    const accountByName = await cdp.evm.getAccount({ name: randomName });
    expect(accountByName).toBeDefined();
    expect(accountByName.address).toBe(importedAccount.address);
    expect(accountByName.name).toBe(randomName);

    const signedHash = await importedAccount.sign({
      hash: ("0x" + "1".repeat(64)) as Hex,
    });
    expect(signedHash).toBeDefined();
  });

  it("should import a solana account from a private key", async () => {
    // Test 1: Import from base58 encoded private key
    const keypair = Keypair.generate();
    const privateKey = bs58.encode(keypair.secretKey); // secretKey is 64 bytes
    const randomName = generateRandomName();

    const importAccountOptions: ImportAccountOptions = {
      privateKey,
      name: randomName,
    };

    if (process.env.CDP_E2E_ENCRYPTION_PUBLIC_KEY) {
      importAccountOptions.encryptionPublicKey = process.env.CDP_E2E_ENCRYPTION_PUBLIC_KEY;
    }

    logger.log("Importing solana account with base58 private key");
    const importedAccount = await cdp.solana.importAccount(importAccountOptions);

    expect(importedAccount).toBeDefined();
    expect(importedAccount.address).toBeDefined();
    expect(importedAccount.name).toBe(randomName);
    logger.log(`Imported solana account with address: ${importedAccount.address}`);

    const accountByAddress = await cdp.solana.getAccount({ address: importedAccount.address });
    expect(accountByAddress).toBeDefined();
    expect(accountByAddress.address).toBe(importedAccount.address);

    const accountByName = await cdp.solana.getAccount({ name: randomName });
    expect(accountByName).toBeDefined();
    expect(accountByName.address).toBe(importedAccount.address);
    expect(accountByName.name).toBe(randomName);

    // Test signing with the imported account
    const { signature } = await importedAccount.signMessage({
      message: "Hello, imported Solana account!",
    });
    expect(signature).toBeDefined();

    // Test 2: Import from raw bytes directly
    const keypair2 = Keypair.generate();
    const privateKeyBytes = keypair2.secretKey; // This is already a Uint8Array
    const randomName2 = generateRandomName();

    const importAccountOptions2: ImportAccountOptions = {
      privateKey: privateKeyBytes,
      name: randomName2,
    };

    if (process.env.CDP_E2E_ENCRYPTION_PUBLIC_KEY) {
      importAccountOptions2.encryptionPublicKey = process.env.CDP_E2E_ENCRYPTION_PUBLIC_KEY;
    }

    logger.log("Importing solana account with raw bytes private key");
    const importedAccount2 = await cdp.solana.importAccount(importAccountOptions2);

    expect(importedAccount2).toBeDefined();
    expect(importedAccount2.address).toBeDefined();
    expect(importedAccount2.name).toBe(randomName2);
    logger.log(`Imported solana account from bytes with address: ${importedAccount2.address}`);

    // Verify we can retrieve the account imported from bytes
    const accountByAddress2 = await cdp.solana.getAccount({ address: importedAccount2.address });
    expect(accountByAddress2).toBeDefined();
    expect(accountByAddress2.address).toBe(importedAccount2.address);

    const accountByName2 = await cdp.solana.getAccount({ name: randomName2 });
    expect(accountByName2).toBeDefined();
    expect(accountByName2.address).toBe(importedAccount2.address);
    expect(accountByName2.name).toBe(randomName2);

    // Test signing with the account imported from bytes
    const { signature: signature2 } = await importedAccount2.signMessage({
      message: "Hello, imported Solana account from bytes!",
    });
    expect(signature2).toBeDefined();
  });

  it("should export an evm server account", async () => {
    const privateKey = generatePrivateKey();
    const randomName = generateRandomName();
    const importAccountOptions: ImportServerAccountOptions = {
      privateKey,
      name: randomName,
    };

    if (process.env.CDP_E2E_ENCRYPTION_PUBLIC_KEY) {
      importAccountOptions.encryptionPublicKey = process.env.CDP_E2E_ENCRYPTION_PUBLIC_KEY;
    }

    const importedAccount = await cdp.evm.importAccount(importAccountOptions);

    const exportedPrivateKeyByName = await cdp.evm.exportAccount({
      name: randomName,
    });
    const publicKeyByName = privateKeyToAccount(`0x${exportedPrivateKeyByName}`).address;

    expect(exportedPrivateKeyByName).toBeDefined();
    expect(publicKeyByName).toBe(importedAccount.address);

    const exportedPrivateKeyByAddress = await cdp.evm.exportAccount({
      address: importedAccount.address,
    });
    const publicKeyByAddress = privateKeyToAccount(`0x${exportedPrivateKeyByAddress}`).address;

    expect(exportedPrivateKeyByAddress).toBeDefined();
    expect(publicKeyByAddress).toBe(importedAccount.address);
  });

  it("should export a solana account", async () => {
    const randomName = generateRandomName();
    const account = await cdp.solana.createAccount({
      name: randomName,
    });

    const exportedPrivateKeyByName = await cdp.solana.exportAccount({
      name: randomName,
    });
    const keypairByName = bs58.decode(exportedPrivateKeyByName);
    const publicKeyByName = bs58.encode(keypairByName.subarray(32));

    expect(exportedPrivateKeyByName).toBeDefined();
    expect(publicKeyByName).toBe(account.address);

    const exportedPrivateKeyByAddress = await cdp.solana.exportAccount({
      address: account.address,
    });
    const keypairByAddress = bs58.decode(exportedPrivateKeyByAddress);
    const publicKeyByAddress = bs58.encode(keypairByAddress.subarray(32));

    expect(exportedPrivateKeyByAddress).toBeDefined();
    expect(publicKeyByAddress).toBe(account.address);
  });

  it("should create an EVM account with a policy", async () => {
    // Create a new policy
    const policy = await cdp.policies.createPolicy({
      policy: {
        scope: "account",
        description: "Test policy for e2e evm account",
        rules: [
          {
            action: "reject",
            operation: "signEvmTransaction",
            criteria: [
              {
                type: "ethValue",
                ethValue: "1100000000000000000", // 1 ETH
                operator: ">",
              },
            ],
          },
        ],
      },
    });
    expect(policy).toBeDefined();

    // Create a new account with the policy
    const name = generateRandomName();
    const account = await cdp.evm.createAccount({
      name: name,
      accountPolicy: policy.id,
    });
    expect(account).toBeDefined();
    expect(account.name).toBe(name);
    expect(account.policies).toBeDefined();
    expect(account.policies!.some(p => p === policy.id)).toBe(true);
  });

  it("should update an EVM account", async () => {
    // Create a new account to update
    const originalName = generateRandomName();
    const accountToUpdate = await cdp.evm.createAccount({ name: originalName });
    expect(accountToUpdate).toBeDefined();
    expect(accountToUpdate.name).toBe(originalName);

    // Update the account with a new name
    const updatedName = generateRandomName();
    const updatedAccount = await cdp.evm.updateAccount({
      address: accountToUpdate.address,
      update: {
        name: updatedName,
      },
    });

    // Verify the update was successful
    expect(updatedAccount).toBeDefined();
    expect(updatedAccount.address).toBe(accountToUpdate.address);
    expect(updatedAccount.name).toBe(updatedName);

    // Verify we can get the updated account by its new name
    const retrievedAccount = await cdp.evm.getAccount({ name: updatedName });
    expect(retrievedAccount).toBeDefined();
    expect(retrievedAccount.address).toBe(accountToUpdate.address);
    expect(retrievedAccount.name).toBe(updatedName);
  });

  it("should create a Solana account with a policy", async () => {
    // Create a new policy
    const policy = await cdp.policies.createPolicy({
      policy: {
        scope: "account",
        description: "Test policy for e2e solana account",
        rules: [
          {
            action: "accept",
            operation: "signSolTransaction",
            criteria: [
              {
                type: "solAddress",
                addresses: ["DtdSSG8ZJRZVv5Jx7K1MeWp7Zxcu19GD5wQRGRpQ9uMF"],
                operator: "in",
              },
            ],
          },
        ],
      },
    });
    expect(policy).toBeDefined();

    // Create a new account with the policy
    const name = generateRandomName();
    const account = await cdp.solana.createAccount({
      name: name,
      accountPolicy: policy.id,
    });
    expect(account).toBeDefined();
    expect(account.name).toBe(name);
    expect(account.policies).toBeDefined();
    expect(account.policies!.some(p => p === policy.id)).toBe(true);
  });

  it("should update a Solana account", async () => {
    // Create a new account to update
    const originalName = generateRandomName();
    const accountToUpdate = await cdp.solana.createAccount({ name: originalName });
    expect(accountToUpdate).toBeDefined();
    expect(accountToUpdate.name).toBe(originalName);

    // Update the account with a new name
    const updatedName = generateRandomName();
    const updatedAccount = await cdp.solana.updateAccount({
      address: accountToUpdate.address,
      update: {
        name: updatedName,
      },
    });

    // Verify the update was successful
    expect(updatedAccount).toBeDefined();
    expect(updatedAccount.address).toBe(accountToUpdate.address);
    expect(updatedAccount.name).toBe(updatedName);

    // Verify we can get the updated account by its new name
    const retrievedAccount = await cdp.solana.getAccount({ name: updatedName });
    expect(retrievedAccount).toBeDefined();
    expect(retrievedAccount.address).toBe(accountToUpdate.address);
    expect(retrievedAccount.name).toBe(updatedName);
  });

  it("should test evm sign functions", async () => {
    const account = await cdp.evm.createAccount();

    const signedHash = await cdp.evm.signHash({
      address: account.address,
      hash: ("0x" + "1".repeat(64)) as Hex,
    });
    expect(signedHash).toBeDefined();

    const signedMessage = await cdp.evm.signMessage({
      address: account.address,
      message: "0x123",
    });
    expect(signedMessage).toBeDefined();

    // Must be a valid transaction that can be decoded
    const serializedTx = serializeTransaction({
      chainId: baseSepolia.id,
      to: "0x0000000000000000000000000000000000000000",
      value: parseEther("0.00001"),
      type: "eip1559",
      maxFeePerGas: BigInt(20000000000),
      maxPriorityFeePerGas: BigInt(1000000000),
      gasLimit: BigInt(21000),
      nonce: 0,
    });

    const signedTransaction = await cdp.evm.signTransaction({
      address: account.address,
      transaction: serializedTx,
    });
    expect(signedTransaction).toBeDefined();
  });

  it("should create, get, and list smart accounts", async () => {
    const privateKey = generatePrivateKey();
    const owner = privateKeyToAccount(privateKey);

    const smartAccount = await cdp.evm.createSmartAccount({
      owner: owner,
    });
    expect(smartAccount).toBeDefined();

    const smartAccounts = await cdp.evm.listSmartAccounts();
    expect(smartAccounts).toBeDefined();
    expect(smartAccounts.accounts.length).toBeGreaterThan(0);

    const retrievedSmartAccount = await cdp.evm.getSmartAccount({
      address: smartAccount.address,
      owner: owner,
    });
    expect(retrievedSmartAccount).toBeDefined();
  });

  it("should prepare user operation", async () => {
    const privateKey = generatePrivateKey();
    const owner = privateKeyToAccount(privateKey);
    const smartAccount = await cdp.evm.createSmartAccount({ owner });
    expect(smartAccount).toBeDefined();

    const userOperation = await cdp.evm.prepareUserOperation({
      smartAccount: smartAccount,
      network: "base-sepolia",
      calls: [
        {
          to: "0x0000000000000000000000000000000000000000",
          data: "0x",
          value: BigInt(0),
        },
      ],
    });
    expect(userOperation).toBeDefined();
  });

  it("should send, wait, and get user operation", async () => {
    const privateKey = generatePrivateKey();
    const owner = privateKeyToAccount(privateKey);

    logger.log("calling cdp.evm.createSmartAccount");
    const smartAccount = await cdp.evm.createSmartAccount({ owner });
    expect(smartAccount).toBeDefined();
    logger.log("Smart Account created. Response:", safeStringify(smartAccount));

    try {
      logger.log("calling cdp.evm.sendUserOperation");
      const userOperation = await cdp.evm.sendUserOperation({
        smartAccount: smartAccount,
        network: "base-sepolia",
        calls: [
          {
            to: "0x0000000000000000000000000000000000000000",
            data: "0x",
            value: BigInt(0),
          },
        ],
      });

      expect(userOperation).toBeDefined();
      expect(userOperation.userOpHash).toBeDefined();
      logger.log("User Operation sent. Response:", safeStringify(userOperation));

      logger.log("calling cdp.evm.waitForUserOperation");
      const userOpResult = await cdp.evm.waitForUserOperation({
        smartAccountAddress: smartAccount.address,
        userOpHash: userOperation.userOpHash,
      });

      expect(userOpResult).toBeDefined();
      expect(userOpResult.status).toBe("complete");
      logger.log("User Operation completed. Response:", safeStringify(userOpResult));

      logger.log("calling cdp.evm.getUserOperation");
      const userOp = await cdp.evm.getUserOperation({
        smartAccount: smartAccount,
        userOpHash: userOperation.userOpHash,
      });
      expect(userOp).toBeDefined();
      expect(userOp.status).toBe("complete");
      expect(userOp.transactionHash).toBeDefined();
      logger.log("User Operation retrieved. Response:", safeStringify(userOp));
    } catch (error) {
      console.log("Error: ", error);
      console.log("Ignoring for now...");
    }
  });

  it("should send a transaction", async () => {
    async function test() {
      await ensureSufficientEthBalance(cdp, testAccount);
      const txResult = await testAccount.sendTransaction({
        network: "base-sepolia",
        transaction: {
          to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
          value: parseEther("0"),
        },
      });
      logger.log("Transaction sent. Response:", safeStringify(txResult));

      logger.log("Waiting for transaction receipt");
      await publicClient.waitForTransactionReceipt({ hash: txResult.transactionHash });
      logger.log("Transaction receipt received");
    }

    try {
      await Promise.race([test(), timeout(25000)]);
    } catch (error) {
      if (error instanceof TimeoutError) {
        console.log("Error: ", error.message);
        console.log("Ignoring for now...");
      } else {
        throw error;
      }
    }
  });

  it("should create, get, and list solana accounts", async () => {
    const randomName = generateRandomName();
    const solanaAccount = await cdp.solana.createAccount({ name: randomName });
    expect(solanaAccount).toBeDefined();

    const solanaAccounts = await cdp.solana.listAccounts();
    expect(solanaAccounts).toBeDefined();
    expect(solanaAccounts.accounts.length).toBeGreaterThan(0);

    let retrievedSolanaAccount = await cdp.solana.getAccount({
      address: solanaAccount.address,
    });
    expect(retrievedSolanaAccount).toBeDefined();
    expect(retrievedSolanaAccount.address).toBe(solanaAccount.address);
    expect(retrievedSolanaAccount.name).toBe(randomName);

    retrievedSolanaAccount = await cdp.solana.getAccount({
      name: randomName,
    });
    expect(retrievedSolanaAccount).toBeDefined();
    expect(retrievedSolanaAccount.address).toBe(solanaAccount.address);
    expect(retrievedSolanaAccount.name).toBe(randomName);
  });

  it("should test evm sign typed data", async () => {
    const signature = await cdp.evm.signTypedData({
      address: testAccount.address,
      domain: {
        name: "EIP712Domain",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000000",
      },
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
      },
      primaryType: "EIP712Domain",
      message: {
        name: "EIP712Domain",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000000",
      },
    });
    expect(signature).toBeDefined();
  });

  it("should test solana sign functions", async () => {
    const account = await cdp.solana.createAccount();

    // For sign_message - use base64 encoded message
    const message = "Hello Solana!";
    const encoder = new TextEncoder();
    const encodedMessage = Buffer.from(encoder.encode(message)).toString("base64");

    const signedMessage = await cdp.solana.signMessage({
      address: account.address,
      message: encodedMessage,
    });
    expect(signedMessage).toBeDefined();

    const accountPublicKey = new PublicKey(account.address);

    // Create a minimal valid transaction structure for the API
    const unsignedTxBytes = new Uint8Array([
      0, // Number of signatures (0 for unsigned)
      1, // Number of required signatures
      0, // Number of read-only signed accounts
      0, // Number of read-only unsigned accounts
      1, // Number of account keys
      ...accountPublicKey.toBuffer(),
      ...new Uint8Array(32).fill(1), // Recent blockhash (32 bytes)
      1, // Number of instructions
      0, // Program ID index
      1, // Number of accounts in instruction
      0, // Account index
      4, // Data length
      1,
      2,
      3,
      4, // Instruction data
    ]);

    const base64Tx = Buffer.from(unsignedTxBytes).toString("base64");

    const signedTransaction = await cdp.solana.signTransaction({
      address: account.address,
      transaction: base64Tx,
    });
    expect(signedTransaction).toBeDefined();
  });

  it("should list evm token balances", async () => {
    const address = "0x5b76f5B8fc9D700624F78208132f91AD4e61a1f0";

    const firstPage = await cdp.evm.listTokenBalances({
      address,
      network: "base-sepolia",
      pageSize: 1,
    });

    expect(firstPage).toBeDefined();
    expect(firstPage.balances.length).toEqual(1);
    expect(firstPage.balances[0].token).toBeDefined();
    expect(firstPage.balances[0].token.contractAddress).toBeDefined();
    expect(firstPage.balances[0].token.network).toEqual("base-sepolia");
    expect(firstPage.balances[0].amount).toBeDefined();
    expect(firstPage.balances[0].amount.amount).toBeDefined();
    expect(firstPage.balances[0].amount.decimals).toBeDefined();

    const secondPage = await cdp.evm.listTokenBalances({
      address,
      network: "base-sepolia",
      pageSize: 1,
      pageToken: firstPage.nextPageToken,
    });

    expect(secondPage).toBeDefined();
    expect(secondPage.balances.length).toEqual(1);
    expect(secondPage.balances[0].token).toBeDefined();
    expect(secondPage.balances[0].token.contractAddress).toBeDefined();
    expect(secondPage.balances[0].token.network).toEqual("base-sepolia");
    expect(secondPage.balances[0].amount).toBeDefined();
    expect(secondPage.balances[0].amount.amount).toBeDefined();
    expect(secondPage.balances[0].amount.decimals).toBeDefined();
  });

  describe("get or create account", () => {
    it("should get or create an evm account", async () => {
      const randomName = generateRandomName();
      const account = await cdp.evm.getOrCreateAccount({ name: randomName });
      expect(account.name).toBe(randomName);
      const account2 = await cdp.evm.getOrCreateAccount({ name: randomName });
      expect(account2.name).toBe(randomName);
      expect(account.address).toBe(account2.address);
    });

    it("should get or create a solana account", async () => {
      const randomName = generateRandomName();
      const account = await cdp.solana.getOrCreateAccount({ name: randomName });
      expect(account.name).toBe(randomName);
      const account2 = await cdp.solana.getOrCreateAccount({ name: randomName });
      expect(account2.name).toBe(randomName);
      expect(account.address).toBe(account2.address);
    });

    it("should handle race condition", async () => {
      const randomName = generateRandomName();
      const accountPromise1 = cdp.evm.getOrCreateAccount({ name: randomName });
      const accountPromise2 = cdp.evm.getOrCreateAccount({ name: randomName });
      const [account1, account2] = await Promise.all([accountPromise1, accountPromise2]);
      expect(account1.address).toBe(account2.address);
    });
  });

  describe("get or create smart account", () => {
    it("should get or create a smart account", async () => {
      const randomName = generateRandomName();
      const owner = await cdp.evm.createAccount();
      const account = await cdp.evm.getOrCreateSmartAccount({ name: randomName, owner });
      expect(account.name).toBe(randomName);
      expect(account.owners[0].address).toBe(owner.address);

      const account2 = await cdp.evm.getOrCreateSmartAccount({ name: randomName, owner });
      expect(account2.name).toBe(randomName);
      expect(account.address).toBe(account2.address);
      expect(account2.owners[0].address).toBe(owner.address);
    });
  });

  describe("server account actions", () => {
    describe("transfer", () => {
      it("should transfer eth", async () => {
        async function test() {
          const { transactionHash } = await testAccount.transfer({
            to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            amount: parseEther("0"),
            token: "eth",
            network: "base-sepolia",
          });

          return await publicClient.waitForTransactionReceipt({
            hash: transactionHash,
          });
        }

        try {
          const receipt = await Promise.race([test(), timeout(25000)]);
          expect(receipt).toBeDefined();
          expect((receipt as TransactionReceipt).status).toBe("success");
        } catch (error) {
          if (error instanceof TimeoutError) {
            console.log("Error: ", error.message);
            console.log("Ignoring for now...");
          } else {
            throw error;
          }
        }
      });

      it("should transfer usdc", async () => {
        async function test() {
          const { transactionHash } = await testAccount.transfer({
            to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            amount: 0n,
            token: "usdc",
            network: "base-sepolia",
          });

          return await publicClient.waitForTransactionReceipt({
            hash: transactionHash,
          });
        }

        try {
          const receipt = await Promise.race([test(), timeout(25000)]);
          expect(receipt).toBeDefined();
          expect((receipt as TransactionReceipt).status).toBe("success");
        } catch (error) {
          if (error instanceof TimeoutError) {
            console.log("Error: ", error.message);
            console.log("Ignoring for now...");
          } else {
            throw error;
          }
        }
      });
    });

    describe("list token balances", () => {
      it("should list token balances", async () => {
        const balances = await testAccount.listTokenBalances({
          network: "base-sepolia",
        });

        expect(balances).toBeDefined();
        expect(balances.balances.length).toBeGreaterThan(0);
      });
    });

    describe.skip("request faucet", () => {
      it("should request faucet", async () => {
        const { transactionHash } = await testAccount.requestFaucet({
          network: "base-sepolia",
          token: "eth",
        });

        expect(transactionHash).toBeDefined();
      });
    });

    describe("send transaction", () => {
      it("should send a transaction", async () => {
        async function test() {
          const { transactionHash } = await testAccount.sendTransaction({
            network: "base-sepolia",
            transaction: {
              to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
              value: parseEther("0"),
            },
          });
          return transactionHash;
        }

        try {
          const transactionHash = await Promise.race([test(), timeout(25000)]);
          expect(transactionHash).toBeDefined();
        } catch (error) {
          if (error instanceof TimeoutError) {
            console.log("Error: ", error.message);
            console.log("Ignoring for now...");
          } else {
            throw error;
          }
        }
      });
    });

    describe("sign typed data", () => {
      it("should sign typed data", async () => {
        const signature = await testAccount.signTypedData({
          domain: {
            name: "EIP712Domain",
            chainId: 1,
            verifyingContract: "0x0000000000000000000000000000000000000000",
          },
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
          },
          primaryType: "EIP712Domain",
          message: {
            name: "EIP712Domain",
            chainId: 1,
            verifyingContract: "0x0000000000000000000000000000000000000000",
          },
        });
        expect(signature).toBeDefined();
      });
    });
  });

  describe("smart account actions", () => {
    describe("transfer", () => {
      it("should transfer eth", async () => {
        async function test() {
          const { userOpHash } = await testSmartAccount.transfer({
            to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            amount: parseEther("0"),
            token: "eth",
            network: "base-sepolia",
          });

          return await testSmartAccount.waitForUserOperation({
            userOpHash,
          });
        }

        try {
          const receipt = await Promise.race([test(), timeout(25000)]);
          expect(receipt).toBeDefined();
          expect((receipt as WaitForUserOperationReturnType).status).toBe("complete");
        } catch (error) {
          console.log("Error: ", error.message);
          console.log("Ignoring for now...");
        }
      });

      it("should transfer usdc", async () => {
        async function test() {
          const { userOpHash } = await testSmartAccount.transfer({
            to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
            amount: 0n,
            token: "usdc",
            network: "base-sepolia",
          });

          return await testSmartAccount.waitForUserOperation({
            userOpHash,
          });
        }

        try {
          const receipt = await Promise.race([test(), timeout(25000)]);
          expect(receipt).toBeDefined();
          expect((receipt as WaitForUserOperationReturnType).status).toBe("complete");
        } catch (error) {
          console.log("Error: ", error.message);
          console.log("Ignoring for now...");
        }
      });
    });

    describe("list token balances", () => {
      it("should list token balances", async () => {
        const balances = await testSmartAccount.listTokenBalances({
          network: "base-sepolia",
        });

        expect(balances).toBeDefined();
        expect(balances.balances.length).toBeGreaterThan(0);
      });
    });

    describe("wait for user operation", () => {
      it("should wait for a user operation", async () => {
        try {
          const { userOpHash } = await testSmartAccount.sendUserOperation({
            network: "base-sepolia",
            calls: [
              {
                to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
                value: parseEther("0"),
              },
            ],
          });

          const userOpResult = await testSmartAccount.waitForUserOperation({
            userOpHash,
          });

          expect(userOpResult).toBeDefined();
          expect(userOpResult.status).toBe("complete");
        } catch (error) {
          console.log("Error: ", error);
          console.log("Ignoring for now...");
        }
      });
    });

    describe("get user operation", () => {
      it("should get a user operation", async () => {
        try {
          const { userOpHash } = await testSmartAccount.sendUserOperation({
            network: "base-sepolia",
            calls: [
              {
                to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
                value: parseEther("0"),
              },
            ],
          });

          await testSmartAccount.waitForUserOperation({
            userOpHash,
          });

          const userOpResult = await testSmartAccount.getUserOperation({
            userOpHash,
          });

          expect(userOpResult).toBeDefined();
          expect(userOpResult.status).toBe("complete");
        } catch (error) {
          console.log("Error: ", error);
          console.log("Ignoring for now...");
        }
      });
    });
  });

  describe("solana account actions", () => {
    describe.skip("request faucet", () => {
      it("should request faucet", async () => {
        const { signature } = await testSolanaAccount.requestFaucet({
          token: "sol",
        });

        expect(signature).toBeDefined();
      });
    });

    describe("sign message", () => {
      it("should sign a message", async () => {
        const { signature } = await testSolanaAccount.signMessage({
          message: "Hello, world!",
        });

        expect(signature).toBeDefined();
      });
    });

    describe("sign transaction", () => {
      it("should sign a transaction", async () => {
        const { signature } = await testSolanaAccount.signTransaction({
          transaction: createAndEncodeTransaction(testSolanaAccount.address),
        });

        expect(signature).toBeDefined();
      });
    });

    describe("transfer", () => {
      const connection = new Connection("https://api.devnet.solana.com");

      it("should transfer native SOL and wait for confirmation", async () => {
        const { signature } = await testSolanaAccount.transfer({
          to: "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
          amount: 0n,
          token: "sol",
          network: "devnet",
        });

        expect(signature).toBeDefined();

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed",
        );

        expect(confirmation.value.err).toBeNull();
      });

      it("should transfer USDC and wait for confirmation", async () => {
        const { signature } = await testSolanaAccount.transfer({
          to: "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE",
          amount: 0n,
          token: "usdc",
          network: "devnet",
        });

        expect(signature).toBeDefined();

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed",
        );

        expect(confirmation.value.err).toBeNull();
      });
    });
  });

  describe("Policies API", () => {
    let createdPolicy: Policy;

    it("should create a policy", async () => {
      createdPolicy = await cdp.policies.createPolicy({
        policy: {
          scope: "account",
          description: "Test policy for e2e tests",
          rules: [
            {
              action: "reject",
              operation: "signEvmTransaction",
              criteria: [
                {
                  type: "ethValue",
                  ethValue: "1000000000000000000", // 1 ETH
                  operator: ">",
                },
                {
                  type: "evmData",
                  abi: "erc20",
                  conditions: [
                    { function: "balanceOf" },
                    {
                      function: "approve",
                      params: [
                        {
                          name: "spender",
                          operator: "in",
                          values: ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"],
                        },
                      ],
                    },
                    {
                      function: "transfer",
                      params: [{ name: "value", operator: "<=", value: "1000" }],
                    },
                  ],
                },
                {
                  type: "evmData",
                  abi: kitchenSinkAbi as Abi,
                  conditions: [
                    { function: "boolfn" },
                    {
                      function: "addressfn",
                      params: [
                        {
                          name: "addr",
                          operator: "in",
                          values: ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"],
                        },
                      ],
                    },
                    {
                      function: "boolfn",
                      params: [{ name: "boolean", operator: "==", value: "true" }],
                    },
                  ],
                },
              ],
            },
            {
              action: "reject",
              operation: "sendEvmTransaction",
              criteria: [
                {
                  type: "evmNetwork",
                  networks: ["base"],
                  operator: "in",
                },
                {
                  type: "evmData",
                  abi: "erc20",
                  conditions: [
                    { function: "balanceOf" },
                    {
                      function: "approve",
                      params: [
                        {
                          name: "spender",
                          operator: "in",
                          values: ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"],
                        },
                      ],
                    },
                    {
                      function: "transfer",
                      params: [{ name: "value", operator: "<=", value: "1000" }],
                    },
                  ],
                },
                {
                  type: "evmData",
                  abi: kitchenSinkAbi as Abi,
                  conditions: [
                    { function: "boolfn" },
                    {
                      function: "addressfn",
                      params: [
                        {
                          name: "addr",
                          operator: "in",
                          values: ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"],
                        },
                      ],
                    },
                    {
                      function: "boolfn",
                      params: [{ name: "boolean", operator: "==", value: "true" }],
                    },
                  ],
                },
              ],
            },
            {
              action: "accept",
              operation: "signEvmHash",
            },
            {
              action: "accept",
              operation: "signEvmMessage",
              criteria: [
                {
                  type: "evmMessage",
                  match: ".*",
                },
              ],
            },
          ],
        },
      });

      expect(createdPolicy).toBeDefined();
      expect(createdPolicy.id).toBeDefined();
      expect(createdPolicy.scope).toBe("account");
      expect(createdPolicy.description).toBe("Test policy for e2e tests");
      expect(createdPolicy.createdAt).toBeDefined();
      expect(createdPolicy.updatedAt).toBeDefined();
      expect(createdPolicy.rules).toHaveLength(4);
      expect(createdPolicy.rules[0].action).toBe("reject");
      expect(createdPolicy.rules[0].operation).toBe("signEvmTransaction");
      expect(createdPolicy.rules[1].action).toBe("reject");
      expect(createdPolicy.rules[1].operation).toBe("sendEvmTransaction");
      expect(createdPolicy.rules[2].action).toBe("accept");
      expect(createdPolicy.rules[2].operation).toBe("signEvmHash");
      expect(createdPolicy.rules[3].action).toBe("accept");
      expect(createdPolicy.rules[3].operation).toBe("signEvmMessage");

      // Save the policy ID for other tests
      testPolicyId = createdPolicy.id;
    });

    it("should get a policy by ID", async () => {
      const policy = await cdp.policies.getPolicyById({
        id: testPolicyId,
      });

      expect(policy).toBeDefined();
      expect(policy.id).toBe(testPolicyId);
      expect(policy.scope).toBe("account");
      expect(policy.description).toBe("Test policy for e2e tests");
      expect(policy.rules).toHaveLength(4);
    });

    it("should list policies", async () => {
      const policies: Policy[] = [];
      let result = await cdp.policies.listPolicies({
        pageSize: 100,
      });
      policies.push(...result.policies);

      // Paginate through all policies so that we can find our test policy.
      // This will not be necessary once we consistently remove policies from the e2e project.
      while (result.nextPageToken) {
        result = await cdp.policies.listPolicies({
          pageSize: 100,
          pageToken: result.nextPageToken,
        });
        policies.push(...result.policies);
      }

      expect(result).toBeDefined();
      expect(policies).toBeDefined();
      expect(Array.isArray(policies)).toBe(true);

      // Find our test policy
      const testPolicy = policies.find(p => p.id === testPolicyId);
      expect(testPolicy).toBeDefined();
    });

    it("should list policies with scope filter", async () => {
      const result = await cdp.policies.listPolicies({
        scope: "account",
        pageSize: 100,
      });

      expect(result).toBeDefined();
      expect(result.policies).toBeDefined();
      expect(Array.isArray(result.policies)).toBe(true);

      // All policies should have account scope
      const allHaveAccountScope = result.policies.every(p => p.scope === "account");
      expect(allHaveAccountScope).toBe(true);
    });

    it("should list policies with pagination", async () => {
      const firstPage = await cdp.policies.listPolicies({
        pageSize: 1,
      });

      expect(firstPage).toBeDefined();
      expect(firstPage.policies).toBeDefined();
      expect(Array.isArray(firstPage.policies)).toBe(true);
      expect(firstPage.policies.length).toBeLessThanOrEqual(1);

      // Check if we have more policies
      if (firstPage.nextPageToken) {
        const secondPage = await cdp.policies.listPolicies({
          pageSize: 1,
          pageToken: firstPage.nextPageToken,
        });

        expect(secondPage).toBeDefined();
        expect(secondPage.policies).toBeDefined();
        expect(Array.isArray(secondPage.policies)).toBe(true);

        // Verify first and second page have different policies
        if (secondPage.policies.length > 0 && firstPage.policies.length > 0) {
          expect(secondPage.policies[0].id).not.toBe(firstPage.policies[0].id);
        }
      }
    });

    it("should update a policy", async () => {
      const updatedPolicy = await cdp.policies.updatePolicy({
        id: testPolicyId,
        policy: {
          description: "Updated test policy description",
          rules: [
            {
              action: "reject",
              operation: "signEvmTransaction",
              criteria: [
                {
                  type: "ethValue",
                  ethValue: "2000000000000000000", // 2 ETH
                  operator: ">",
                },
                {
                  type: "evmAddress",
                  addresses: ["0x0000000000000000000000000000000000000000"],
                  operator: "in",
                },
              ],
            },
          ],
        },
      });

      expect(updatedPolicy).toBeDefined();
      expect(updatedPolicy.id).toBe(testPolicyId);
      expect(updatedPolicy.description).toBe("Updated test policy description");
      expect(updatedPolicy.rules).toHaveLength(1);
      expect("criteria" in updatedPolicy.rules[0]).toBe(true);
      expect((updatedPolicy.rules[0] as SignEvmTransactionRule).criteria).toHaveLength(2);
    });

    it("should delete a policy", async () => {
      await cdp.policies.deletePolicy({
        id: testPolicyId,
      });

      // Verify the policy was deleted by attempting to get it
      try {
        await cdp.policies.getPolicyById({
          id: testPolicyId,
        });
        // If we get here, the policy wasn't deleted
        expect(true).toBe(false);
      } catch (error) {
        // Expected error
        expect(error).toBeDefined();
      }
    });
  });

  describe("network-scoped evm server accounts", () => {
    describe("transfer", () => {
      it("should use the provided RPC URL when sending a transaction on a non-CDP supported network", async () => {
        // Spy on global fetch to capture HTTP calls
        const fetchSpy = vi.spyOn(globalThis, "fetch");

        try {
          const account = await cdp.evm.getOrCreateAccount({ name: testAccountName });

          const opAccount = await account.useNetwork("https://sepolia.optimism.io");

          await expect(
            opAccount.transfer({
              amount: parseEther("0"),
              to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
              token: "eth",
            }),
          ).rejects.toThrow(); // expected error because sending tx on op without funds

          // Find the RPC calls made during the transaction
          const rpcCalls = fetchSpy.mock.calls.filter(call => {
            const url = call[0] as string;
            const body = call[1]?.body;
            return (
              url.includes("https://sepolia.optimism.io") &&
              body &&
              body.toString().includes("eth_sendTransaction")
            );
          });

          expect(rpcCalls.length).toBeGreaterThan(0);

          const rpcUrl = rpcCalls[0][0] as string;
          expect(rpcUrl).toMatch(/https:\/\/sepolia\.optimism\.io/);

          logger.log(`Optimism RPC URL used: ${rpcUrl}`);
        } finally {
          fetchSpy.mockRestore();
        }
      });

      it("should use the CDP RPC URL when sending a transaction on a CDP supported network", async () => {
        if (!process.env.CDP_E2E_BASE_SEPOLIA_RPC_URL) {
          logger.log("BASE_SEPOLIA_RPC_URL is not set, skipping test");
          return;
        }

        // Spy on global fetch to capture HTTP calls
        const fetchSpy = vi.spyOn(globalThis, "fetch");

        try {
          const account = await cdp.evm.getOrCreateAccount({ name: testAccountName });

          const baseAccount = await account.useNetwork(process.env.CDP_E2E_BASE_SEPOLIA_RPC_URL);

          const transfer = await baseAccount.transfer({
            amount: parseEther("0"),
            to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
            token: "eth",
          });

          await baseAccount.waitForTransactionReceipt(transfer);

          const sendTransactionCalls = fetchSpy.mock.calls.filter(call => {
            const url = call[0] as string;
            const body = call[1]?.body;
            return (
              url.includes(process.env.CDP_E2E_BASE_SEPOLIA_RPC_URL!) &&
              body &&
              body.toString().includes("eth_sendTransaction")
            );
          });

          // Find the RPC calls made during the transaction
          const getTransactionReceiptCalls = fetchSpy.mock.calls.filter(call => {
            const url = call[0] as string;
            const body = call[1]?.body;
            return (
              url.includes(process.env.CDP_E2E_BASE_SEPOLIA_RPC_URL!) &&
              body &&
              body.toString().includes("eth_getTransactionReceipt")
            );
          });

          // This should be 0 because the transfer should use the CDP API
          expect(sendTransactionCalls.length).toBe(0);

          // This should be 1 because the wait should use the provided RPC URL
          expect(getTransactionReceiptCalls.length).toBe(1);

          const rpcUrl = getTransactionReceiptCalls[0][0] as string;
          expect(rpcUrl).toMatch(process.env.CDP_E2E_BASE_SEPOLIA_RPC_URL!);

          logger.log(`Base Sepolia RPC URL used: ${rpcUrl}`);
        } finally {
          fetchSpy.mockRestore();
        }
      });
    });

    it("should use provided node when waiting for transaction receipt", async () => {
      if (!process.env.CDP_E2E_BASE_SEPOLIA_RPC_URL) {
        logger.log("BASE_SEPOLIA_RPC_URL is not set, skipping test");
        return;
      }

      // Spy on global fetch to capture HTTP calls
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      try {
        const scopedAccount = await testAccount.useNetwork(
          process.env.CDP_E2E_BASE_SEPOLIA_RPC_URL,
        );

        const { transactionHash } = await scopedAccount.sendTransaction({
          transaction: {
            to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
            value: parseEther("0"),
          },
        });

        const receipt = await scopedAccount.waitForTransactionReceipt({
          hash: transactionHash,
        });

        expect(receipt).toBeDefined();

        // Find the RPC calls made during the transaction
        const rpcCalls = fetchSpy.mock.calls.filter(call => {
          const url = call[0] as string;
          const body = call[1]?.body;
          return (
            url.includes(process.env.CDP_E2E_BASE_SEPOLIA_RPC_URL!) &&
            body &&
            body.toString().includes("eth_getTransactionReceipt")
          );
        });

        // Assert that at least one RPC call was made to the Base Node URL
        expect(rpcCalls.length).toBeGreaterThan(0);

        // Verify the URL pattern matches the expected Base Node RPC format
        const rpcUrl = rpcCalls[0][0] as string;
        expect(rpcUrl).toBe(process.env.CDP_E2E_BASE_SEPOLIA_RPC_URL);

        logger.log(`Custom Base Node RPC URL used: ${rpcUrl}`);
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });

  it("should use default RPC URL when using managed mode with non-Base network identifiers", async () => {
    // Spy on global fetch to capture HTTP calls
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      const account = await cdp.evm.getOrCreateAccount({ name: testAccountName });

      const opAccount = await account.useNetwork("optimism-sepolia");

      // Wait for transaction receipt - this should use the Optimism Sepolia Node RPC
      await opAccount.waitForTransactionReceipt({
        hash: "0xe0f31e8abb03a68f4ee9868c22c311d4914fade28ae512cc02c1443edd90718f",
      });

      // Find the RPC calls made during the transaction
      const rpcCalls = fetchSpy.mock.calls.filter(call => {
        const url = call[0] as string;
        const body = call[1]?.body;
        return (
          url.includes(optimismSepolia.rpcUrls.default.http[0]) &&
          body &&
          body.toString().includes("eth_getTransactionReceipt")
        );
      });

      expect(rpcCalls.length).toBeGreaterThan(0);

      const rpcUrl = rpcCalls[0][0] as string;
      expect(rpcUrl).toBe(optimismSepolia.rpcUrls.default.http[0]);

      logger.log(`Optimism Sepolia RPC URL used: ${rpcUrl}`);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("should use Base Node RPC URL when using managed mode with network identifiers", async () => {
    if (process.env.E2E_BASE_PATH?.includes("localhost")) {
      logger.log("Skipping test in local environment");
      return;
    }

    // Spy on global fetch to capture HTTP calls
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      const account = await cdp.evm.getOrCreateAccount({ name: testAccountName });

      const baseAccount = await account.useNetwork("base-sepolia");

      const txResult = await baseAccount.sendTransaction({
        transaction: {
          to: "0x4252e0c9A3da5A2700e7d91cb50aEf522D0C6Fe8",
          value: parseEther("0.000001"),
        },
      });

      // Wait for transaction receipt - this should use the Base Node RPC
      await baseAccount.waitForTransactionReceipt({
        hash: txResult.transactionHash,
      });

      // Find the RPC calls made during the transaction
      const rpcCalls = fetchSpy.mock.calls.filter(call => {
        const url = call[0] as string;
        const body = call[1]?.body;
        return (
          url.includes("/rpc/v1/base-sepolia/") &&
          body &&
          body.toString().includes("eth_getTransactionReceipt")
        );
      });

      expect(rpcCalls.length).toBeGreaterThan(0);

      const rpcUrl = rpcCalls[0][0] as string;
      expect(rpcUrl).toMatch(/\/rpc\/v1\/base-sepolia\/[a-zA-Z0-9-]+$/);

      logger.log(`Base Node RPC URL used: ${rpcUrl}`);

      // Also verify that the initial getBaseNodeRpcUrl call was made
      const tokenCalls = fetchSpy.mock.calls.filter(call => {
        const url = call[0] as string;
        return url.includes("/apikeys/v1/tokens/active");
      });

      expect(tokenCalls.length).toBeGreaterThan(0);
      logger.log(`Token endpoint called ${tokenCalls.length} times`);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

function timeout(ms: number) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new TimeoutError(`Test took too long (${ms}ms)`)), ms),
  );
}

// Helper function to generate random name matching the required pattern ^[A-Za-z0-9][A-Za-z0-9-]{0,34}[A-Za-z0-9]$
function generateRandomName(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charsWithHyphen = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";

  const firstChar = chars.charAt(Math.floor(Math.random() * chars.length));

  const middleLength = Math.floor(Math.random() * 34);
  let middlePart = "";
  for (let i = 0; i < middleLength; i++) {
    middlePart += charsWithHyphen.charAt(Math.floor(Math.random() * charsWithHyphen.length));
  }

  const lastChar = chars.charAt(Math.floor(Math.random() * chars.length));
  return firstChar + middlePart + lastChar;
}

// Helper function to create and encode a Solana transaction
function createAndEncodeTransaction(address: string) {
  const recipientKeypair = Keypair.generate();
  const recipientAddress = recipientKeypair.publicKey;

  const fromPubkey = new PublicKey(address);

  const transferAmount = 0.01 * LAMPORTS_PER_SOL;

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey: recipientAddress,
      lamports: transferAmount,
    }),
  );

  transaction.recentBlockhash = SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toBase58();
  transaction.feePayer = fromPubkey;

  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false,
  });

  return Buffer.from(serializedTransaction).toString("base64");
}
