package com.coinbase.cdp.utils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/** Utility class for cryptographic hashing operations. */
public final class HashUtils {

  private HashUtils() {}

  /**
   * Computes the SHA-256 hash of a string and returns it as a lowercase hex string.
   *
   * @param input the string to hash
   * @return the SHA-256 hash as a lowercase hex string
   * @throws RuntimeException if SHA-256 algorithm is not available
   */
  public static String sha256Hex(String input) {
    if (input == null) {
      return null;
    }
    return sha256Hex(input.getBytes(StandardCharsets.UTF_8));
  }

  /**
   * Computes the SHA-256 hash of a byte array and returns it as a lowercase hex string.
   *
   * @param input the bytes to hash
   * @return the SHA-256 hash as a lowercase hex string
   * @throws RuntimeException if SHA-256 algorithm is not available
   */
  public static String sha256Hex(byte[] input) {
    if (input == null) {
      return null;
    }

    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(input);
      return bytesToHex(hash);
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException("SHA-256 algorithm not available", e);
    }
  }

  private static String bytesToHex(byte[] bytes) {
    StringBuilder hex = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) {
      hex.append(String.format("%02x", b));
    }
    return hex.toString();
  }
}
