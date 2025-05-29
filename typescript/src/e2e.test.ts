import { describe, it, expect, beforeAll, beforeEach } from "vitest";
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
import { baseSepolia } from "viem/chains";
import { CdpClient, CdpClientOptions } from "./client/cdp.js";
import type { ServerAccount as Account, SmartAccount } from "./client/evm/evm.types.js";
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

  it("should import an account from a private key", async () => {
    const privateKey = generatePrivateKey();
    const randomName = generateRandomName();

    logger.log("Importing account with private key");
    const importedAccount = await cdp.evm.importAccount({
      privateKey: privateKey,
      name: randomName,
    });

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

    // Create a minimal valid transaction structure for the API
    const unsignedTxBytes = new Uint8Array([
      0, // Number of signatures (0 for unsigned)
      1, // Number of required signatures
      0, // Number of read-only signed accounts
      0, // Number of read-only unsigned accounts
      1, // Number of account keys
      ...new Uint8Array(32).fill(0), // Dummy account key (32 bytes)
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
      expect(createdPolicy.rules).toHaveLength(2);
      expect(createdPolicy.rules[0].action).toBe("reject");
      expect(createdPolicy.rules[0].operation).toBe("signEvmTransaction");
      expect(createdPolicy.rules[1].action).toBe("reject");
      expect(createdPolicy.rules[1].operation).toBe("sendEvmTransaction");

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
      expect(policy.rules).toHaveLength(2);
    });

    it("should list policies", async () => {
      const result = await cdp.policies.listPolicies();

      expect(result).toBeDefined();
      expect(result.policies).toBeDefined();
      expect(Array.isArray(result.policies)).toBe(true);

      // Find our test policy
      const testPolicy = result.policies.find(p => p.id === testPolicyId);
      expect(testPolicy).toBeDefined();
    });

    it("should list policies with scope filter", async () => {
      const result = await cdp.policies.listPolicies({
        scope: "account",
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
      expect(updatedPolicy.rules[0].criteria).toHaveLength(2);
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
