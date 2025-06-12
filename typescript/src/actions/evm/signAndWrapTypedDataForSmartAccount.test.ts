import { describe, expect, it, vi, beforeEach } from "vitest";
import { MockedFunction } from "vitest";
import { hashTypedData, sliceHex, encodePacked, encodeAbiParameters } from "viem";

import {
  signAndWrapTypedDataForSmartAccount,
  createReplaySafeTypedData,
  createSmartAccountSignatureWrapper,
} from "./signAndWrapTypedDataForSmartAccount.js";
import type { EvmSmartAccount } from "../../accounts/evm/types.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type { EIP712Message, Hex, Address } from "../../types/misc.js";

// Mock viem functions
vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    hashTypedData: vi.fn(),
    sliceHex: vi.fn(),
    encodePacked: vi.fn(),
    encodeAbiParameters: vi.fn(),
  };
});

describe("signAndWrapTypedDataForSmartAccount", () => {
  let mockClient: CdpOpenApiClientType;
  let mockSmartAccount: EvmSmartAccount;
  let mockTypedData: EIP712Message;
  const mockSmartAccountAddress = "0x1234567890123456789012345678901234567890" as Address;
  const mockOwnerAddress = "0xabcdef1234567890abcdef1234567890abcdef12" as Address;
  const mockChainId = 1n;

  beforeEach(() => {
    vi.resetAllMocks();

    mockClient = {
      signEvmTypedData: vi.fn(),
    } as unknown as CdpOpenApiClientType;

    mockSmartAccount = {
      address: mockSmartAccountAddress,
      owners: [
        {
          address: mockOwnerAddress,
          sign: vi.fn(),
          signMessage: vi.fn(),
          signTransaction: vi.fn(),
          signTypedData: vi.fn(),
        },
      ],
      type: "evm-smart",
    } as unknown as EvmSmartAccount;

    mockTypedData = {
      domain: {
        name: "Permit2",
        chainId: 1,
        verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
      },
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        PermitTransferFrom: [
          { name: "permitted", type: "TokenPermissions" },
          { name: "spender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
        TokenPermissions: [
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
        ],
      },
      primaryType: "PermitTransferFrom",
      message: {
        permitted: {
          token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          amount: "1000000",
        },
        spender: "0xFfFfFfFFfFFfFFfFFfFFFFFffFFFffffFfFFFfFf",
        nonce: "0",
        deadline: "1717123200",
      },
    };
  });

  describe("signAndWrapTypedDataForSmartAccount", () => {
    it("should sign and wrap typed data for smart account", async () => {
      const mockOriginalHash =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      const mockSignature = {
        signature:
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab12" as Hex,
      };
      const mockWrappedSignature = "0xwrapped_signature" as Hex;

      (hashTypedData as MockedFunction<typeof hashTypedData>).mockReturnValue(mockOriginalHash);
      (
        mockClient.signEvmTypedData as MockedFunction<typeof mockClient.signEvmTypedData>
      ).mockResolvedValue(mockSignature);
      (sliceHex as MockedFunction<typeof sliceHex>)
        .mockReturnValueOnce(
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex,
        ) // r
        .mockReturnValueOnce(
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex,
        ); // s
      (encodePacked as MockedFunction<typeof encodePacked>).mockReturnValue(
        "0xpacked_signature" as Hex,
      );
      (encodeAbiParameters as MockedFunction<typeof encodeAbiParameters>).mockReturnValue(
        mockWrappedSignature,
      );

      const result = await signAndWrapTypedDataForSmartAccount(mockClient, {
        smartAccount: mockSmartAccount,
        chainId: mockChainId,
        typedData: mockTypedData,
      });

      // Verify hashTypedData was called with original typed data
      expect(hashTypedData).toHaveBeenCalledWith(mockTypedData);

      // Verify signEvmTypedData was called with replay-safe typed data
      expect(mockClient.signEvmTypedData).toHaveBeenCalledWith(
        mockOwnerAddress,
        {
          domain: {
            name: "Coinbase Smart Wallet",
            version: "1",
            chainId: Number(mockChainId),
            verifyingContract: mockSmartAccountAddress,
          },
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            CoinbaseSmartWalletMessage: [{ name: "hash", type: "bytes32" }],
          },
          primaryType: "CoinbaseSmartWalletMessage",
          message: {
            hash: mockOriginalHash,
          },
        },
        undefined,
      );

      // Verify the result
      expect(result).toEqual({
        signature: mockWrappedSignature,
      });
    });

    it("should handle custom owner index", async () => {
      const ownerIndex = 1n;
      const mockOriginalHash =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      const mockSignature = { signature: "0xsignature" as Hex };
      const mockWrappedSignature = "0xwrapped_signature" as Hex;

      // Add second owner to smart account
      mockSmartAccount.owners.push({
        address: "0x9876543210987654321098765432109876543210" as Address,
        sign: vi.fn(),
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
        signTypedData: vi.fn(),
      });

      (hashTypedData as MockedFunction<typeof hashTypedData>).mockReturnValue(mockOriginalHash);
      (
        mockClient.signEvmTypedData as MockedFunction<typeof mockClient.signEvmTypedData>
      ).mockResolvedValue(mockSignature);
      (sliceHex as MockedFunction<typeof sliceHex>)
        .mockReturnValueOnce(
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex,
        ) // r
        .mockReturnValueOnce(
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex,
        ); // s
      (encodePacked as MockedFunction<typeof encodePacked>).mockReturnValue(
        "0xpacked_signature" as Hex,
      );
      (encodeAbiParameters as MockedFunction<typeof encodeAbiParameters>).mockReturnValue(
        mockWrappedSignature,
      );

      await signAndWrapTypedDataForSmartAccount(mockClient, {
        smartAccount: mockSmartAccount,
        chainId: mockChainId,
        typedData: mockTypedData,
        ownerIndex,
      });

      // Verify signEvmTypedData was called with the second owner's address
      expect(mockClient.signEvmTypedData).toHaveBeenCalledWith(
        "0x9876543210987654321098765432109876543210",
        expect.any(Object),
        undefined,
      );
    });

    it("should pass idempotency key to signEvmTypedData", async () => {
      const idempotencyKey = "test-idempotency-key";
      const mockOriginalHash =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      const mockSignature = { signature: "0xsignature" as Hex };
      const mockWrappedSignature = "0xwrapped_signature" as Hex;

      (hashTypedData as MockedFunction<typeof hashTypedData>).mockReturnValue(mockOriginalHash);
      (
        mockClient.signEvmTypedData as MockedFunction<typeof mockClient.signEvmTypedData>
      ).mockResolvedValue(mockSignature);
      (sliceHex as MockedFunction<typeof sliceHex>)
        .mockReturnValueOnce(
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex,
        ) // r
        .mockReturnValueOnce(
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex,
        ); // s
      (encodePacked as MockedFunction<typeof encodePacked>).mockReturnValue(
        "0xpacked_signature" as Hex,
      );
      (encodeAbiParameters as MockedFunction<typeof encodeAbiParameters>).mockReturnValue(
        mockWrappedSignature,
      );

      await signAndWrapTypedDataForSmartAccount(mockClient, {
        smartAccount: mockSmartAccount,
        chainId: mockChainId,
        typedData: mockTypedData,
        idempotencyKey,
      });

      // Verify idempotency key was passed
      expect(mockClient.signEvmTypedData).toHaveBeenCalledWith(
        mockOwnerAddress,
        expect.any(Object),
        idempotencyKey,
      );
    });
  });

  describe("createReplaySafeTypedData", () => {
    it("should create replay-safe typed data", () => {
      const mockOriginalHash =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      (hashTypedData as MockedFunction<typeof hashTypedData>).mockReturnValue(mockOriginalHash);

      const result = createReplaySafeTypedData({
        typedData: mockTypedData,
        chainId: mockChainId,
        smartAccountAddress: mockSmartAccountAddress,
      });

      // Verify hashTypedData was called with original typed data
      expect(hashTypedData).toHaveBeenCalledWith(mockTypedData);

      // Verify the replay-safe structure
      expect(result).toEqual({
        domain: {
          name: "Coinbase Smart Wallet",
          version: "1",
          chainId: Number(mockChainId),
          verifyingContract: mockSmartAccountAddress,
        },
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          CoinbaseSmartWalletMessage: [{ name: "hash", type: "bytes32" }],
        },
        primaryType: "CoinbaseSmartWalletMessage",
        message: {
          hash: mockOriginalHash,
        },
      });
    });

    it("should handle different chain IDs", () => {
      const differentChainId = 8453n; // Base
      const mockOriginalHash =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      (hashTypedData as MockedFunction<typeof hashTypedData>).mockReturnValue(mockOriginalHash);

      const result = createReplaySafeTypedData({
        typedData: mockTypedData,
        chainId: differentChainId,
        smartAccountAddress: mockSmartAccountAddress,
      });

      expect(result.domain.chainId).toBe(Number(differentChainId));
      expect(result.domain.verifyingContract).toBe(mockSmartAccountAddress);
    });
  });

  describe("createSmartAccountSignatureWrapper", () => {
    it("should create signature wrapper with correct encoding", () => {
      const mockSignatureHex =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12" as Hex;
      const ownerIndex = 0n;
      const mockR = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      const mockS = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      const mockPackedSignature = "0xpacked_signature" as Hex;
      const mockWrappedSignature = "0xwrapped_signature" as Hex;

      (sliceHex as MockedFunction<typeof sliceHex>)
        .mockReturnValueOnce(mockR) // r
        .mockReturnValueOnce(mockS); // s
      (encodePacked as MockedFunction<typeof encodePacked>).mockReturnValue(mockPackedSignature);
      (encodeAbiParameters as MockedFunction<typeof encodeAbiParameters>).mockReturnValue(
        mockWrappedSignature,
      );

      const result = createSmartAccountSignatureWrapper({
        signatureHex: mockSignatureHex,
        ownerIndex,
      });

      // Verify sliceHex was called correctly for r and s
      expect(sliceHex).toHaveBeenCalledWith(mockSignatureHex, 0, 32); // r
      expect(sliceHex).toHaveBeenCalledWith(mockSignatureHex, 32, 64); // s

      // Verify encodePacked was called with r, s, v
      expect(encodePacked).toHaveBeenCalledWith(
        ["bytes32", "bytes32", "uint8"],
        [mockR, mockS, 0x12], // v extracted from signature
      );

      // Verify encodeAbiParameters was called with SignatureWrapper struct
      expect(encodeAbiParameters).toHaveBeenCalledWith(
        [
          {
            components: [
              {
                name: "ownerIndex",
                type: "uint8",
              },
              {
                name: "signatureData",
                type: "bytes",
              },
            ],
            name: "SignatureWrapper",
            type: "tuple",
          },
        ],
        [
          {
            ownerIndex: Number(ownerIndex),
            signatureData: mockPackedSignature,
          },
        ],
      );

      expect(result).toBe(mockWrappedSignature);
    });

    it("should handle different owner indices", () => {
      const mockSignatureHex =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12" as Hex;
      const ownerIndex = 2n;
      const mockR = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      const mockS = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      const mockPackedSignature = "0xpacked_signature" as Hex;
      const mockWrappedSignature = "0xwrapped_signature" as Hex;

      (sliceHex as MockedFunction<typeof sliceHex>)
        .mockReturnValueOnce(mockR) // r
        .mockReturnValueOnce(mockS); // s
      (encodePacked as MockedFunction<typeof encodePacked>).mockReturnValue(mockPackedSignature);
      (encodeAbiParameters as MockedFunction<typeof encodeAbiParameters>).mockReturnValue(
        mockWrappedSignature,
      );

      createSmartAccountSignatureWrapper({
        signatureHex: mockSignatureHex,
        ownerIndex,
      });

      // Verify encodeAbiParameters was called with the correct owner index
      expect(encodeAbiParameters).toHaveBeenCalledWith(expect.any(Array), [
        {
          ownerIndex: Number(ownerIndex), // Should be 2
          signatureData: mockPackedSignature,
        },
      ]);
    });

    it("should extract v value correctly from signature", () => {
      // Test signature with different v value (0x1c at the end)
      const mockSignatureHex =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c" as Hex;
      const ownerIndex = 0n;
      const mockR = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      const mockS = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;
      const mockPackedSignature = "0xpacked_signature" as Hex;
      const mockWrappedSignature = "0xwrapped_signature" as Hex;

      (sliceHex as MockedFunction<typeof sliceHex>)
        .mockReturnValueOnce(mockR) // r
        .mockReturnValueOnce(mockS); // s
      (encodePacked as MockedFunction<typeof encodePacked>).mockReturnValue(mockPackedSignature);
      (encodeAbiParameters as MockedFunction<typeof encodeAbiParameters>).mockReturnValue(
        mockWrappedSignature,
      );

      createSmartAccountSignatureWrapper({
        signatureHex: mockSignatureHex,
        ownerIndex,
      });

      // Verify encodePacked was called with correct v value (0x1c = 28)
      expect(encodePacked).toHaveBeenCalledWith(
        ["bytes32", "bytes32", "uint8"],
        [mockR, mockS, 0x1c], // v extracted from signature
      );
    });
  });
});
