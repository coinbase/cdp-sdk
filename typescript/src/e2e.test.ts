import { describe, it, expect, beforeAll, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  serializeTransaction,
  parseEther,
  createPublicClient,
  http,
  type Hex,
  type PublicClient,
  type Transport,
  type Chain,
} from "viem";
import { baseSepolia } from "viem/chains";
import { CdpClient } from "./client/cdp.js";
import dotenv from "dotenv";
import type { ServerAccount as Account, SmartAccount } from "./client/evm/evm.types.js";

dotenv.config();

const testSmartAccountAddress = "0x0A32E0DFb3eb262A7e03B9B880956264D6aCf755";
const testAccountName = "E2ETestAccount";

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

vi.mock("./analytics.js", () => {
  return {
    wrapClassWithErrorTracking: vi.fn(),
  };
});

describe("CDP Client E2E Tests", () => {
  let cdp: CdpClient;
  let publicClient: PublicClient<Transport, Chain>;

  let testAccount: Account;
  let testSmartAccount: SmartAccount;

  beforeAll(async () => {
    cdp = new CdpClient();
    publicClient = createPublicClient<Transport, Chain>({
      chain: baseSepolia,
      transport: http(),
    });

    testAccount = await cdp.evm.getOrCreateAccount({ name: testAccountName });
    testSmartAccount = await cdp.evm.getSmartAccount({
      address: testSmartAccountAddress,
      owner: testAccount,
    });
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
  });

  it("should send a transaction", async () => {
    logger.log("Calling cdp.evm.sendTransaction");
    const txResult = await cdp.evm.sendTransaction({
      address: testAccount.address,
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

  describe("server account actions", () => {
    describe("transfer", () => {
      it("should transfer eth", async () => {
        const { status } = await testAccount.transfer({
          to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
          amount: "0",
          token: "eth",
          network: "base-sepolia",
        });

        expect(status).toBe("success");
      });

      it("should transfer usdc", async () => {
        const { status } = await testAccount.transfer({
          to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
          amount: "0",
          token: "usdc",
          network: "base-sepolia",
        });

        expect(status).toBe("success");
      });
    });
  });

  describe("smart account actions", () => {
    describe("transfer", () => {
      it("should transfer eth", async () => {
        const { status } = await testSmartAccount.transfer({
          to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
          amount: "0",
          token: "eth",
          network: "base-sepolia",
        });

        expect(status).toBe("success");
      });

      it("should transfer usdc", async () => {
        const { status } = await testSmartAccount.transfer({
          to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
          amount: "0",
          token: "usdc",
          network: "base-sepolia",
        });

        expect(status).toBe("success");
      });
    });
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
});

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
