import { Address } from "viem";

import { CdpOpenApiClientType, ListEvmTokenBalancesNetwork } from "../../openapi-client/index.js";

/**
 * A token on an EVM network, which is either an ERC-20 or a native token (i.e. ETH).
 */
export interface EvmToken {
  /**
   * The contract address of the token. For Ether, the contract address is 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
   * per EIP-7528. For ERC-20 tokens, this is the contract address where the token is deployed.
   */
  contractAddress: Address;
  /** The network the token is on. */
  network: ListEvmTokenBalancesNetwork;
  /**
   * The symbol of the token, which is optional and non-unique. Note: This field
   * may not be present for most tokens while the API is still under development.
   */
  symbol?: string;
  /**
   * The name of the token, which is optional and non-unique. Note: This field
   * may not be present for most tokens while the API is still under development.
   */
  name?: string;
}

/**
 * A token amount on an EVM network.
 */
export interface EvmTokenAmount {
  /** The amount of the token in the smallest indivisible unit of the token. */
  amount: bigint;
  /** The number of decimals in the token. */
  decimals: number;
}
/**
 * An EVM token balance.
 */
export interface EvmTokenBalance {
  /** The token. */
  token: EvmToken;
  /** The amount of the token. */
  amount: EvmTokenAmount;
}

/**
 * Options for listing EVM token balances.
 */
export interface ListTokenBalancesOptions {
  /** The address of the account. */
  address: Address;
  /** The network. */
  network: ListEvmTokenBalancesNetwork;
  /** The page size to paginate through the token balances. */
  pageSize?: number;
  /** The page token to paginate through the token balances. */
  pageToken?: string;
}

/**
 * The result of listing EVM token balances.
 */
export interface ListTokenBalancesResult {
  /** The token balances. */
  balances: EvmTokenBalance[];
  /**
   * The next page token to paginate through the token balances.
   * If undefined, there are no more token balances to paginate through.
   */
  nextPageToken?: string;
}

/**
 * List the token balances for an EVM account.
 *
 * @param client - The client to use to list the token balances.
 * @param options - The options for listing the token balances.
 * @returns The result of listing the token balances.
 */
export async function listTokenBalances(
  client: CdpOpenApiClientType,
  options: ListTokenBalancesOptions,
): Promise<ListTokenBalancesResult> {
  const response = await client.listDataTokenBalances(options.network, options.address, {
    pageSize: options.pageSize,
    pageToken: options.pageToken,
  });

  const balances = response.balances.map(balance => {
    return {
      token: {
        network: balance.token.network,
        contractAddress: balance.token.contractAddress as Address,
        symbol: balance.token.symbol,
        name: balance.token.name,
      },
      amount: {
        amount: BigInt(balance.amount.amount),
        decimals: balance.amount.decimals,
      },
    };
  });

  return {
    balances,
    nextPageToken: response.nextPageToken,
  };
}
