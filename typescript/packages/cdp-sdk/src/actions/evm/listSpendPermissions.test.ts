import { describe, expect, it, vi, beforeEach } from "vitest";

import { listSpendPermissions } from "./listSpendPermissions.js";

import type { CdpOpenApiClient } from "../../openapi-client/index.js";
import type { ListSpendPermissionsOptions } from "../../spend-permissions/types.js";
import type { Address } from "../../types/misc.js";

describe("listSpendPermissions", () => {
  let mockClient: typeof CdpOpenApiClient;
  const mockAddress = "0x1234567890123456789012345678901234567890" as Address;

  const mockPermission = {
    createdAt: "2024-01-01T00:00:00Z",
    permissionHash: "0xabc",
    permission: {
      account: "0x1111111111111111111111111111111111111111",
      spender: "0x2222222222222222222222222222222222222222",
      token: "0x3333333333333333333333333333333333333333",
      allowance: "1000",
      period: "86400",
      start: "0",
      end: "281474976710655",
      salt: "1",
      extraData: "0x",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      listSpendPermissions: vi.fn(),
    } as unknown as typeof CdpOpenApiClient;
  });

  it("should forward nextPageToken from the underlying response", async () => {
    (mockClient.listSpendPermissions as any).mockResolvedValue({
      nextPageToken: "page-2",
      spendPermissions: [mockPermission],
    });

    const options: ListSpendPermissionsOptions = { address: mockAddress };

    const result = await listSpendPermissions(mockClient, options);

    expect(result.nextPageToken).toBe("page-2");
    expect(result.spendPermissions).toHaveLength(1);
  });

  it("should leave nextPageToken undefined when the response has none", async () => {
    (mockClient.listSpendPermissions as any).mockResolvedValue({
      spendPermissions: [],
    });

    const result = await listSpendPermissions(mockClient, { address: mockAddress });

    expect(result.nextPageToken).toBeUndefined();
    expect(result.spendPermissions).toEqual([]);
  });

  it("should forward pagination options to the client", async () => {
    (mockClient.listSpendPermissions as any).mockResolvedValue({
      nextPageToken: "page-3",
      spendPermissions: [],
    });

    await listSpendPermissions(mockClient, {
      address: mockAddress,
      pageSize: 20,
      pageToken: "page-2",
    });

    expect(mockClient.listSpendPermissions).toHaveBeenCalledWith(mockAddress, {
      pageSize: 20,
      pageToken: "page-2",
    });
  });

  it("should transform permission fields to their expected runtime types", async () => {
    (mockClient.listSpendPermissions as any).mockResolvedValue({
      spendPermissions: [mockPermission],
    });

    const result = await listSpendPermissions(mockClient, { address: mockAddress });

    const permission = result.spendPermissions[0].permission;
    expect(permission.allowance).toBe(BigInt(1000));
    expect(permission.period).toBe(86400);
    expect(permission.start).toBe(0);
    expect(permission.end).toBe(281474976710655);
    expect(permission.salt).toBe(BigInt(1));
  });
});
