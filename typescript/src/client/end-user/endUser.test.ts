import { describe, it, expect, vi, beforeEach, MockedFunction } from "vitest";

import {
  CdpOpenApiClient,
  type ListEndUsers200,
  type LookupEndUser200,
  type EndUser,
} from "../../openapi-client/index.js";

import { EndUserClient } from "./endUser.js";

vi.mock("../../openapi-client/index.js", () => {
  return {
    CdpOpenApiClient: {
      listEndUsers: vi.fn(),
      lookupEndUser: vi.fn(),
    },
  };
});

vi.mock("../../analytics.js", () => ({
  Analytics: {
    trackAction: vi.fn(),
  },
}));

describe("EndUserClient", () => {
  let client: EndUserClient;

  const mockEndUser: EndUser = {
    userId: "user-123",
    authenticationMethods: {
      emailMethods: [],
      smsMethods: [],
      googleMethods: [],
      appleMethods: [],
      githubMethods: [],
    },
    evmAccounts: [],
    evmAccountObjects: [],
    evmSmartAccounts: [],
    evmSmartAccountObjects: [],
    solanaAccounts: [],
    solanaAccountObjects: [],
    createdAt: "2024-01-01T00:00:00Z",
  };

  const mockEndUser2: EndUser = {
    ...mockEndUser,
    userId: "user-456",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new EndUserClient();
  });

  describe("listEndUsers", () => {
    it("should list end users with default options", async () => {
      const listEndUsersMock = CdpOpenApiClient.listEndUsers as MockedFunction<
        typeof CdpOpenApiClient.listEndUsers
      >;

      const mockResponse: ListEndUsers200 = {
        endUsers: [mockEndUser, mockEndUser2],
        nextPageToken: "next-token",
      };

      listEndUsersMock.mockResolvedValue(mockResponse);

      const result = await client.listEndUsers();

      expect(result).toEqual(mockResponse);
      expect(result.endUsers).toHaveLength(2);
      expect(result.endUsers[0].userId).toBe("user-123");
      expect(result.endUsers[1].userId).toBe("user-456");
      expect(result.nextPageToken).toBe("next-token");
      expect(listEndUsersMock).toHaveBeenCalledWith({});
    });

    it("should list end users with pagination parameters", async () => {
      const listEndUsersMock = CdpOpenApiClient.listEndUsers as MockedFunction<
        typeof CdpOpenApiClient.listEndUsers
      >;

      const mockResponse: ListEndUsers200 = {
        endUsers: [mockEndUser],
        nextPageToken: undefined,
      };

      listEndUsersMock.mockResolvedValue(mockResponse);

      const result = await client.listEndUsers({
        pageSize: 10,
        pageToken: "page-token-123",
      });

      expect(result.endUsers).toHaveLength(1);
      expect(result.nextPageToken).toBeUndefined();
      expect(listEndUsersMock).toHaveBeenCalledWith({
        pageSize: 10,
        pageToken: "page-token-123",
      });
    });

    it("should join sort array into comma-separated string", async () => {
      const listEndUsersMock = CdpOpenApiClient.listEndUsers as MockedFunction<
        typeof CdpOpenApiClient.listEndUsers
      >;

      const mockResponse: ListEndUsers200 = {
        endUsers: [mockEndUser],
      };

      listEndUsersMock.mockResolvedValue(mockResponse);

      await client.listEndUsers({
        sort: ["createdAt=desc"],
      });

      expect(listEndUsersMock).toHaveBeenCalledWith({
        sort: "createdAt=desc",
      });
    });

    it("should return empty endUsers array when no end users exist", async () => {
      const listEndUsersMock = CdpOpenApiClient.listEndUsers as MockedFunction<
        typeof CdpOpenApiClient.listEndUsers
      >;

      const mockResponse: ListEndUsers200 = {
        endUsers: [],
      };

      listEndUsersMock.mockResolvedValue(mockResponse);

      const result = await client.listEndUsers();

      expect(result.endUsers).toEqual([]);
      expect(result.nextPageToken).toBeUndefined();
      expect(listEndUsersMock).toHaveBeenCalledWith({});
    });
  });

  describe("lookupEndUser", () => {
    it("should return an array of matching end users", async () => {
      const lookupEndUserMock = CdpOpenApiClient.lookupEndUser as MockedFunction<
        typeof CdpOpenApiClient.lookupEndUser
      >;

      const mockResponse: LookupEndUser200 = {
        endUsers: [mockEndUser, mockEndUser2],
      };

      lookupEndUserMock.mockResolvedValue(mockResponse);

      const result = await client.lookupEndUser({ email: "user@example.com" });

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe("user-123");
      expect(result[1].userId).toBe("user-456");
      expect(lookupEndUserMock).toHaveBeenCalledWith({ email: "user@example.com" });
    });

    it("should return a single-element array when one user matches", async () => {
      const lookupEndUserMock = CdpOpenApiClient.lookupEndUser as MockedFunction<
        typeof CdpOpenApiClient.lookupEndUser
      >;

      const mockResponse: LookupEndUser200 = {
        endUsers: [mockEndUser],
      };

      lookupEndUserMock.mockResolvedValue(mockResponse);

      const result = await client.lookupEndUser({ email: "user@example.com" });

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-123");
    });

    it("should return an empty array when no users match", async () => {
      const lookupEndUserMock = CdpOpenApiClient.lookupEndUser as MockedFunction<
        typeof CdpOpenApiClient.lookupEndUser
      >;

      const mockResponse: LookupEndUser200 = {
        endUsers: [],
      };

      lookupEndUserMock.mockResolvedValue(mockResponse);

      const result = await client.lookupEndUser({ email: "nobody@example.com" });

      expect(result).toEqual([]);
      expect(lookupEndUserMock).toHaveBeenCalledWith({ email: "nobody@example.com" });
    });

    it("should look up an end user by phone number", async () => {
      const lookupEndUserMock = CdpOpenApiClient.lookupEndUser as MockedFunction<
        typeof CdpOpenApiClient.lookupEndUser
      >;

      const mockResponse: LookupEndUser200 = {
        endUsers: [mockEndUser],
      };

      lookupEndUserMock.mockResolvedValue(mockResponse);

      const result = await client.lookupEndUser({ phoneNumber: "+14155552671" });

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-123");
      expect(lookupEndUserMock).toHaveBeenCalledWith({
        email: undefined,
        phoneNumber: "+14155552671",
      });
    });
  });
});
