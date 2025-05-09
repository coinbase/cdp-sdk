import { describe, it, expect, vi, beforeEach } from "vitest";
import { toEvmServerAccount } from "./toEvmServerAccount.js";
import { EvmAccount, EvmServerAccount } from "./types.js";
import { Address, Hash } from "../../types/misc.js";
import { Transaction } from "viem";
import { transfer } from "../../actions/evm/transfer/transfer.js";
import { accountTransferStrategy } from "../../actions/evm/transfer/accountTransferStrategy.js";
import { CdpOpenApiClientType } from "../../openapi-client/index.js";
import { TransferOptions } from "../../actions/evm/transfer/types.js";
vi.mock("viem", () => ({
  serializeTransaction: () => "0xserializedtx",
}));

vi.mock("../../actions/evm/transfer/transfer.js", () => ({
  ...vi.importActual("../../actions/evm/transfer/transfer.js"),
  transfer: vi.fn().mockResolvedValue({ transactionHash: "0xmocktransactionhash" }),
}));

describe("toEvmServerAccount", () => {
  let mockApiClient: CdpOpenApiClientType;
  let mockAccount: EvmAccount;
  let mockAddress: Address;
  let serverAccount: EvmServerAccount;

  beforeEach(() => {
    mockAddress = "0x123456789abcdef" as Address;

    mockApiClient = {
      signEvmMessage: vi.fn().mockResolvedValue({ signature: "0xmocksignature" }),
      signEvmHash: vi.fn().mockResolvedValue({ signature: "0xmocksignature" }),
      signEvmTransaction: vi.fn().mockResolvedValue({ signedTransaction: "0xmocktransaction" }),
      signEvmTypedData: vi.fn().mockResolvedValue({ signature: "0xmocksignature" }),
    } as unknown as CdpOpenApiClientType;

    mockAccount = {
      address: mockAddress,
      sign: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signTypedData: vi.fn(),
    };

    serverAccount = toEvmServerAccount(mockApiClient, {
      account: mockAccount,
    });
  });

  it("should use the address from the provided account", () => {
    expect(serverAccount.address).toBe(mockAddress);
  });

  it("should have the correct type property", () => {
    expect(serverAccount.type).toBe("evm-server");
  });

  it("should call apiClient.signEvmMessage when signMessage is called", async () => {
    const message = "Hello World";
    await serverAccount.signMessage({ message });

    expect(mockApiClient.signEvmMessage).toHaveBeenCalledWith(mockAddress, {
      message: message.toString(),
    });
  });

  it("should call apiClient.signEvmHash when sign is called", async () => {
    const hash = "0xhash123" as Hash;
    await serverAccount.sign({ hash });

    expect(mockApiClient.signEvmHash).toHaveBeenCalledWith(mockAddress, { hash });
  });

  it("should call apiClient.signEvmTransaction when signTransaction is called", async () => {
    const mockTransaction = { to: "0xrecipient" } as unknown as Transaction;

    await serverAccount.signTransaction(mockTransaction);

    expect(mockApiClient.signEvmTransaction).toHaveBeenCalledWith(mockAddress, {
      transaction: "0xserializedtx",
    });
  });

  it("should call apiClient.signEvmTypedData when signTypedData is called", async () => {
    const message = {
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
    };

    await serverAccount.signTypedData(message);

    expect(mockApiClient.signEvmTypedData).toHaveBeenCalledWith(mockAddress, message);
  });

  it("should call transfer action when transfer is called", async () => {
    const transferArgs: TransferOptions = {
      to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d" as Address,
      amount: "0.000001",
      token: "usdc",
      network: "base-sepolia",
    };

    await serverAccount.transfer(transferArgs);

    expect(transfer).toHaveBeenCalledWith(
      mockApiClient,
      serverAccount,
      transferArgs,
      accountTransferStrategy,
    );
  });
});
