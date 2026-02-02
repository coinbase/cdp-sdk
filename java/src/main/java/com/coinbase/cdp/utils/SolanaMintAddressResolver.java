package com.coinbase.cdp.utils;

import com.coinbase.cdp.openapi.model.SendSolanaTransactionRequest.NetworkEnum;
import java.util.Map;

/**
 * Utility for resolving Solana token symbols to mint addresses.
 *
 * <p>Supports resolving common token symbols (e.g., "usdc") to their mint addresses on supported
 * networks. Also handles native SOL and direct mint address inputs.
 */
public final class SolanaMintAddressResolver {

  /** Native SOL identifier. */
  public static final String NATIVE_SOL = "sol";

  /** USDC token identifier. */
  public static final String USDC = "usdc";

  /** Mint address map: network -> token symbol -> mint address. */
  private static final Map<NetworkEnum, Map<String, String>> MINT_ADDRESS_MAP =
      Map.of(
          NetworkEnum.SOLANA,
          Map.of(USDC, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
          NetworkEnum.SOLANA_DEVNET,
          Map.of(USDC, "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"));

  private SolanaMintAddressResolver() {}

  /**
   * Resolves a token symbol or mint address to a mint address.
   *
   * <p>If the token is "sol", returns null (indicates native transfer). If the token is a known
   * symbol (e.g., "usdc"), returns the mint address for the network. If the token is already a
   * base58-encoded address, returns it as-is.
   *
   * @param token the token symbol or mint address
   * @param network the network
   * @return the token mint address, or null for native SOL
   * @throws IllegalArgumentException if the token cannot be resolved for the network
   */
  public static String resolve(String token, NetworkEnum network) {
    if (token == null || token.isBlank()) {
      throw new IllegalArgumentException("token is required");
    }

    String normalizedToken = token.toLowerCase().trim();

    // Native SOL transfer
    if (NATIVE_SOL.equals(normalizedToken)) {
      return null;
    }

    // Already a base58 address (Solana addresses are 32-44 characters, alphanumeric)
    if (token.length() >= 32 && token.length() <= 44 && isBase58(token)) {
      return token;
    }

    // Look up in mint address map
    Map<String, String> networkTokens = MINT_ADDRESS_MAP.get(network);
    if (networkTokens != null) {
      String address = networkTokens.get(normalizedToken);
      if (address != null) {
        return address;
      }
    }

    throw new IllegalArgumentException(
        String.format(
            "Token '%s' is not supported on %s. Please provide the token mint address directly.",
            token, network.getValue()));
  }

  /**
   * Checks if the token represents native SOL.
   *
   * @param token the token symbol
   * @return true if native SOL
   */
  public static boolean isNativeSol(String token) {
    return token != null && NATIVE_SOL.equals(token.toLowerCase().trim());
  }

  /**
   * Checks if a string is a valid base58 encoded string.
   *
   * @param value the string to check
   * @return true if base58 encoded
   */
  private static boolean isBase58(String value) {
    // Base58 alphabet (Bitcoin/Solana): 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    // Note: no 0, O, I, l
    for (char c : value.toCharArray()) {
      if (!((c >= '1' && c <= '9')
          || (c >= 'A' && c <= 'H')
          || (c >= 'J' && c <= 'N')
          || (c >= 'P' && c <= 'Z')
          || (c >= 'a' && c <= 'k')
          || (c >= 'm' && c <= 'z'))) {
        return false;
      }
    }
    return true;
  }
}
