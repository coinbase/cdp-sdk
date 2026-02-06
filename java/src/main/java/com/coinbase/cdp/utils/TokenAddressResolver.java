package com.coinbase.cdp.utils;

import com.coinbase.cdp.openapi.model.SendEvmTransactionRequest.NetworkEnum;
import java.util.Map;

/**
 * Utility for resolving token symbols to contract addresses.
 *
 * <p>Supports resolving common token symbols (e.g., "usdc") to their contract addresses on
 * supported networks. Also handles native ETH and direct contract address inputs.
 */
public final class TokenAddressResolver {

  /** Native ETH identifier. */
  public static final String NATIVE_ETH = "eth";

  /** USDC token identifier. */
  public static final String USDC = "usdc";

  /** Address map: network -> token symbol -> contract address. */
  private static final Map<NetworkEnum, Map<String, String>> ADDRESS_MAP =
      Map.of(
          NetworkEnum.BASE,
          Map.of(USDC, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
          NetworkEnum.BASE_SEPOLIA,
          Map.of(USDC, "0x036CbD53842c5426634e7929541eC2318f3dCF7e"));

  private TokenAddressResolver() {}

  /**
   * Resolves a token symbol or address to a contract address.
   *
   * <p>If the token is "eth", returns null (indicates native transfer). If the token is a known
   * symbol (e.g., "usdc"), returns the contract address for the network. If the token is already an
   * address (0x-prefixed), returns it as-is.
   *
   * @param token the token symbol or address
   * @param network the network
   * @return the token contract address, or null for native ETH
   * @throws IllegalArgumentException if the token cannot be resolved for the network
   */
  public static String resolve(String token, NetworkEnum network) {
    if (token == null || token.isBlank()) {
      throw new IllegalArgumentException("token is required");
    }

    String normalizedToken = token.toLowerCase().trim();

    // Native ETH transfer
    if (NATIVE_ETH.equals(normalizedToken)) {
      return null;
    }

    // Already a hex address
    if (normalizedToken.startsWith("0x") && normalizedToken.length() == 42) {
      return token; // Return original case
    }

    // Look up in address map
    Map<String, String> networkTokens = ADDRESS_MAP.get(network);
    if (networkTokens != null) {
      String address = networkTokens.get(normalizedToken);
      if (address != null) {
        return address;
      }
    }

    throw new IllegalArgumentException(
        String.format(
            "Token '%s' is not supported on %s. Please provide the token contract address directly.",
            token, network.getValue()));
  }

  /**
   * Checks if the token represents native ETH.
   *
   * @param token the token symbol
   * @return true if native ETH
   */
  public static boolean isNativeEth(String token) {
    return token != null && NATIVE_ETH.equals(token.toLowerCase().trim());
  }
}
