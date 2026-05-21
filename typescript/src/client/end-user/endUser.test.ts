import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../openapi-client/index.js", () => ({
  CdpOpenApiClient: {
    createEndUser: vi.fn(),
    importEndUser: vi.fn(),
    addEndUserEvmAccount: vi.fn(),
    addEndUserEvmSmartAccount: vi.fn(),
    addEndUserSolanaAccount: vi.fn(),
    revokeDelegationForEndUser: vi.fn(),
    revokeDelegationForEndUserAccount: vi.fn(),
    signEvmTransactionWithEndUserAccount: vi.fn(),
    signEvmMessageWithEndUserAccount: vi.fn(),
    signEvmTypedDataWithEndUserAccount: vi.fn(),
    sendEvmTransactionWithEndUserAccount: vi.fn(),
    sendEvmAssetWithEndUserAccount: vi.fn(),
    sendUserOperationWithEndUserAccount: vi.fn(),
    createEvmEip7702DelegationWithEndUserAccount: vi.fn(),
    signSolanaMessageWithEndUserAccount: vi.fn(),
    signSolanaTransactionWithEndUserAccount: vi.fn(),
    sendSolanaTransactionWithEndUserAccount: vi.fn(),
    sendSolanaAssetWithEndUserAccount: vi.fn(),
  },
}));

vi.mock("./toEndUserAccount.js", () => ({
  toEndUserAccount: vi.fn().mockReturnValue({} as any),
}));

vi.mock("../../analytics.js", () => ({
  Analytics: {
    trackAction: vi.fn(),
    trackError: vi.fn(),
  },
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("generated-uuid"),
  publicEncrypt: vi.fn().mockReturnValue(Buffer.from("encrypted")),
  constants: {
    RSA_PKCS1_OAEP_PADDING: 4,
  },
}));

import { CdpOpenApiClient } from "../../openapi-client/index.js";
import { EndUserClient } from "./endUser.js";

const mockClient = vi.mocked(CdpOpenApiClient);

describe("EndUserClient idempotencyKey forwarding", () => {
  let client: EndUserClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new EndUserClient();
  });

  it("should forward idempotencyKey for createEndUser", async () => {
    mockClient.createEndUser.mockResolvedValueOnce({ userId: "generated-uuid" } as any);

    await client.createEndUser({
      authenticationMethods: [{ type: "email", email: "test@example.com" }],
      idempotencyKey: "test-key",
    });

    expect(mockClient.createEndUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "generated-uuid" }),
      "test-key",
    );
  });

  it("should forward idempotencyKey for importEndUser", async () => {
    mockClient.importEndUser.mockResolvedValueOnce({ userId: "generated-uuid" } as any);

    await client.importEndUser({
      authenticationMethods: [{ type: "email", email: "test@example.com" }],
      privateKey: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      keyType: "evm",
      idempotencyKey: "test-key",
    });

    expect(mockClient.importEndUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "generated-uuid" }),
      "test-key",
    );
  });

  it("should forward idempotencyKey for addEndUserEvmAccount", async () => {
    mockClient.addEndUserEvmAccount.mockResolvedValueOnce({} as any);

    await client.addEndUserEvmAccount({
      userId: "user-1",
      idempotencyKey: "test-key",
    });

    expect(mockClient.addEndUserEvmAccount).toHaveBeenCalledWith("user-1", {}, "test-key");
  });

  it("should forward idempotencyKey for addEndUserEvmSmartAccount", async () => {
    mockClient.addEndUserEvmSmartAccount.mockResolvedValueOnce({} as any);

    await client.addEndUserEvmSmartAccount({
      userId: "user-1",
      enableSpendPermissions: false,
      idempotencyKey: "test-key",
    });

    expect(mockClient.addEndUserEvmSmartAccount).toHaveBeenCalledWith(
      "user-1",
      { enableSpendPermissions: false },
      "test-key",
    );
  });

  it("should forward idempotencyKey for addEndUserSolanaAccount", async () => {
    mockClient.addEndUserSolanaAccount.mockResolvedValueOnce({} as any);

    await client.addEndUserSolanaAccount({
      userId: "user-1",
      idempotencyKey: "test-key",
    });

    expect(mockClient.addEndUserSolanaAccount).toHaveBeenCalledWith("user-1", {}, "test-key");
  });

  it("should forward idempotencyKey for revokeDelegationForEndUser", async () => {
    mockClient.revokeDelegationForEndUser.mockResolvedValueOnce(undefined as any);

    await client.revokeDelegationForEndUser({
      userId: "user-1",
      idempotencyKey: "test-key",
    });

    expect(mockClient.revokeDelegationForEndUser).toHaveBeenCalledWith(
      "user-1",
      {},
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for revokeDelegationForEndUserAccount", async () => {
    mockClient.revokeDelegationForEndUserAccount.mockResolvedValueOnce(undefined as any);

    await client.revokeDelegationForEndUserAccount({
      userId: "user-1",
      address: "0xabc",
      idempotencyKey: "test-key",
    });

    expect(mockClient.revokeDelegationForEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      "0xabc",
      {},
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for signEvmTransaction", async () => {
    mockClient.signEvmTransactionWithEndUserAccount.mockResolvedValueOnce({} as any);

    await client.signEvmTransaction({
      userId: "user-1",
      address: "0xabc",
      transaction: "0x02...",
      idempotencyKey: "test-key",
    });

    expect(mockClient.signEvmTransactionWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      { address: "0xabc", transaction: "0x02..." },
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for signEvmMessage", async () => {
    mockClient.signEvmMessageWithEndUserAccount.mockResolvedValueOnce({} as any);

    await client.signEvmMessage({
      userId: "user-1",
      address: "0xabc",
      message: "Hello",
      idempotencyKey: "test-key",
    });

    expect(mockClient.signEvmMessageWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      { address: "0xabc", message: "Hello" },
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for signEvmTypedData", async () => {
    mockClient.signEvmTypedDataWithEndUserAccount.mockResolvedValueOnce({} as any);

    const typedData = { domain: {}, types: {}, primaryType: "Test", message: {} };

    await client.signEvmTypedData({
      userId: "user-1",
      address: "0xabc",
      typedData: typedData as any,
      idempotencyKey: "test-key",
    });

    expect(mockClient.signEvmTypedDataWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      { address: "0xabc", typedData },
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for sendEvmTransaction", async () => {
    mockClient.sendEvmTransactionWithEndUserAccount.mockResolvedValueOnce({} as any);

    await client.sendEvmTransaction({
      userId: "user-1",
      address: "0xabc",
      transaction: "0x02...",
      network: "base-sepolia",
      idempotencyKey: "test-key",
    });

    expect(mockClient.sendEvmTransactionWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      { address: "0xabc", transaction: "0x02...", network: "base-sepolia" },
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for sendEvmAsset", async () => {
    mockClient.sendEvmAssetWithEndUserAccount.mockResolvedValueOnce({} as any);

    await client.sendEvmAsset({
      userId: "user-1",
      address: "0xabc",
      asset: "eth",
      to: "0xdef",
      amount: "1000",
      network: "base-sepolia",
      idempotencyKey: "test-key",
    });

    expect(mockClient.sendEvmAssetWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      "0xabc",
      "eth",
      {
        to: "0xdef",
        amount: "1000",
        network: "base-sepolia",
        useCdpPaymaster: undefined,
        paymasterUrl: undefined,
      },
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for sendUserOperation", async () => {
    mockClient.sendUserOperationWithEndUserAccount.mockResolvedValueOnce({} as any);

    await client.sendUserOperation({
      userId: "user-1",
      address: "0xabc",
      network: "base-sepolia",
      calls: [{ to: "0xdef", value: "0", data: "0x" }],
      useCdpPaymaster: true,
      idempotencyKey: "test-key",
    });

    expect(mockClient.sendUserOperationWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      "0xabc",
      {
        network: "base-sepolia",
        calls: [{ to: "0xdef", value: "0", data: "0x" }],
        useCdpPaymaster: true,
        paymasterUrl: undefined,
        dataSuffix: undefined,
      },
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for createEvmEip7702Delegation", async () => {
    mockClient.createEvmEip7702DelegationWithEndUserAccount.mockResolvedValueOnce({} as any);

    await client.createEvmEip7702Delegation({
      userId: "user-1",
      address: "0xabc",
      network: "base-sepolia",
      idempotencyKey: "test-key",
    });

    expect(mockClient.createEvmEip7702DelegationWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      {
        address: "0xabc",
        network: "base-sepolia",
        enableSpendPermissions: undefined,
      },
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for signSolanaMessage", async () => {
    mockClient.signSolanaMessageWithEndUserAccount.mockResolvedValueOnce({} as any);

    await client.signSolanaMessage({
      userId: "user-1",
      address: "So1ana",
      message: "base64msg",
      idempotencyKey: "test-key",
    });

    expect(mockClient.signSolanaMessageWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      { address: "So1ana", message: "base64msg" },
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for signSolanaTransaction", async () => {
    mockClient.signSolanaTransactionWithEndUserAccount.mockResolvedValueOnce({} as any);

    await client.signSolanaTransaction({
      userId: "user-1",
      address: "So1ana",
      transaction: "base64tx",
      idempotencyKey: "test-key",
    });

    expect(mockClient.signSolanaTransactionWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      { address: "So1ana", transaction: "base64tx" },
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for sendSolanaTransaction", async () => {
    mockClient.sendSolanaTransactionWithEndUserAccount.mockResolvedValueOnce({} as any);

    await client.sendSolanaTransaction({
      userId: "user-1",
      address: "So1ana",
      transaction: "base64tx",
      network: "solana-devnet",
      idempotencyKey: "test-key",
    });

    expect(mockClient.sendSolanaTransactionWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      { address: "So1ana", transaction: "base64tx", network: "solana-devnet" },
      undefined,
      "test-key",
    );
  });

  it("should forward idempotencyKey for sendSolanaAsset", async () => {
    mockClient.sendSolanaAssetWithEndUserAccount.mockResolvedValueOnce({} as any);

    await client.sendSolanaAsset({
      userId: "user-1",
      address: "So1ana",
      asset: "usdc",
      to: "Recipi",
      amount: "1000000",
      network: "solana-devnet",
      idempotencyKey: "test-key",
    });

    expect(mockClient.sendSolanaAssetWithEndUserAccount).toHaveBeenCalledWith(
      "user-1",
      "So1ana",
      "usdc",
      {
        to: "Recipi",
        amount: "1000000",
        network: "solana-devnet",
        createRecipientAta: undefined,
      },
      undefined,
      "test-key",
    );
  });
});
