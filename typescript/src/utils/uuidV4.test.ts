import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "crypto";
import { createDeterministicUuidV4 } from "./uuidV4.js";

// Mock crypto module
vi.mock("crypto", () => ({
  createHash: vi.fn(),
}));

describe("createDeterministicUuidV4", () => {
  let mockHash: {
    update: ReturnType<typeof vi.fn>;
    digest: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockHash = {
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(),
    };

    (createHash as ReturnType<typeof vi.fn>).mockReturnValue(mockHash);
  });

  it("should create a deterministic UUIDv4 with default salt", () => {
    const input = "test-input";
    const mockDigest = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    mockHash.digest.mockReturnValue(mockDigest);

    const result = createDeterministicUuidV4(input);

    // Verify crypto operations
    expect(createHash).toHaveBeenCalledWith("sha256");
    expect(mockHash.update).toHaveBeenCalledWith("test-input-salt");
    expect(mockHash.digest).toHaveBeenCalledWith("hex");

    // Verify UUIDv4 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    // Verify specific structure based on the mock digest
    const expectedUuid = "abcdef12-3456-4890-abcd-ef1234567890";
    expect(result).toBe(expectedUuid);
  });

  it("should create a deterministic UUIDv4 with custom salt", () => {
    const input = "test-input";
    const customSalt = "custom-salt";
    const mockDigest = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    mockHash.digest.mockReturnValue(mockDigest);

    const result = createDeterministicUuidV4(input, customSalt);

    // Verify crypto operations with custom salt
    expect(createHash).toHaveBeenCalledWith("sha256");
    expect(mockHash.update).toHaveBeenCalledWith("test-input-custom-salt");
    expect(mockHash.digest).toHaveBeenCalledWith("hex");

    // Verify UUIDv4 format
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    // Verify specific structure based on the mock digest
    const expectedUuid = "12345678-90ab-4def-9234-567890abcdef";
    expect(result).toBe(expectedUuid);
  });

  it("should always produce version 4 UUIDs", () => {
    const mockDigest = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    mockHash.digest.mockReturnValue(mockDigest);

    const result = createDeterministicUuidV4("test");

    // Version 4 UUID must have '4' in the version position (13th character)
    expect(result.charAt(14)).toBe("4");
  });

  it("should properly set variant bits", () => {
    // Test with different 17th character values to verify variant bits
    const testCases = [
      {
        digest: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "8",
      },
      {
        digest: "0123456789abcdef1123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "9",
      },
      {
        digest: "0123456789abcdef2123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "a",
      },
      {
        digest: "0123456789abcdef3123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "b",
      },
      {
        digest: "0123456789abcdef4123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "8",
      },
      {
        digest: "0123456789abcdef5123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "9",
      },
      {
        digest: "0123456789abcdef6123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "a",
      },
      {
        digest: "0123456789abcdef7123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "b",
      },
      {
        digest: "0123456789abcdef8123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "8",
      },
      {
        digest: "0123456789abcdef9123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "9",
      },
      {
        digest: "0123456789abcdefa123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "a",
      },
      {
        digest: "0123456789abcdefb123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "b",
      },
      {
        digest: "0123456789abcdefc123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "8",
      },
      {
        digest: "0123456789abcdefd123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "9",
      },
      {
        digest: "0123456789abcdefe123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "a",
      },
      {
        digest: "0123456789abcdeff123456789abcdef0123456789abcdef0123456789abcdef",
        expectedVariant: "b",
      },
    ];

    testCases.forEach(({ digest, expectedVariant }) => {
      mockHash.digest.mockReturnValue(digest);
      const result = createDeterministicUuidV4("test");

      // Variant bits should be 10xx (8, 9, a, b in hex)
      expect(result.charAt(19)).toBe(expectedVariant);
      expect(["8", "9", "a", "b"]).toContain(result.charAt(19));
    });
  });

  it("should produce consistent results for same input", () => {
    const input = "consistent-test";
    const mockDigest = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    mockHash.digest.mockReturnValue(mockDigest);

    const result1 = createDeterministicUuidV4(input);

    // Reset mocks and call again
    vi.resetAllMocks();
    (createHash as ReturnType<typeof vi.fn>).mockReturnValue(mockHash);
    mockHash.update = vi.fn().mockReturnThis();
    mockHash.digest = vi.fn().mockReturnValue(mockDigest);

    const result2 = createDeterministicUuidV4(input);

    expect(result1).toBe(result2);
  });

  it("should produce different results for different inputs", () => {
    const mockDigest1 = "1111111111111111111111111111111111111111111111111111111111111111";
    const mockDigest2 = "2222222222222222222222222222222222222222222222222222222222222222";

    mockHash.digest.mockReturnValueOnce(mockDigest1);
    const result1 = createDeterministicUuidV4("input1");

    mockHash.digest.mockReturnValueOnce(mockDigest2);
    const result2 = createDeterministicUuidV4("input2");

    expect(result1).not.toBe(result2);
  });

  it("should produce different results for different salts", () => {
    const input = "same-input";
    const mockDigest1 = "1111111111111111111111111111111111111111111111111111111111111111";
    const mockDigest2 = "2222222222222222222222222222222222222222222222222222222222222222";

    mockHash.digest.mockReturnValueOnce(mockDigest1);
    const result1 = createDeterministicUuidV4(input, "salt1");

    mockHash.digest.mockReturnValueOnce(mockDigest2);
    const result2 = createDeterministicUuidV4(input, "salt2");

    expect(result1).not.toBe(result2);
  });

  it("should handle empty input", () => {
    const mockDigest = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    mockHash.digest.mockReturnValue(mockDigest);

    const result = createDeterministicUuidV4("");

    expect(createHash).toHaveBeenCalledWith("sha256");
    expect(mockHash.update).toHaveBeenCalledWith("-salt");
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("should handle special characters in input", () => {
    const specialInput = "test@#$%^&*()_+-=[]{}|;':\",./<>?";
    const mockDigest = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    mockHash.digest.mockReturnValue(mockDigest);

    const result = createDeterministicUuidV4(specialInput);

    expect(mockHash.update).toHaveBeenCalledWith(`${specialInput}-salt`);
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("should create permit2 idempotency keys as mentioned in comments", () => {
    // This test verifies the specific use case mentioned in the function's documentation
    const baseIdempotencyKey = "swap-operation-123";
    const mockDigest = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    mockHash.digest.mockReturnValue(mockDigest);

    const permit2Key = createDeterministicUuidV4(baseIdempotencyKey, "permit2");

    expect(mockHash.update).toHaveBeenCalledWith("swap-operation-123-permit2");
    expect(permit2Key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("should handle very long inputs", () => {
    const longInput = "a".repeat(1000);
    const mockDigest = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    mockHash.digest.mockReturnValue(mockDigest);

    const result = createDeterministicUuidV4(longInput);

    expect(mockHash.update).toHaveBeenCalledWith(`${longInput}-salt`);
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
