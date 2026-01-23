package com.coinbase.cdp.utils;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

class HashUtilsTest {

  @Test
  void sha256HexProducesCorrectHash() {
    // Known SHA-256 hash of "hello"
    String expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

    String hash = HashUtils.sha256Hex("hello");

    assertThat(hash).isEqualTo(expected);
  }

  @Test
  void sha256HexProducesLowercaseHex() {
    String hash = HashUtils.sha256Hex("test");

    assertThat(hash).matches("[a-f0-9]{64}");
  }

  @Test
  void sha256HexProduces64CharacterOutput() {
    String hash = HashUtils.sha256Hex("any input");

    assertThat(hash).hasSize(64);
  }

  @Test
  void sha256HexHandlesEmptyString() {
    // Known SHA-256 hash of empty string
    String expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    String hash = HashUtils.sha256Hex("");

    assertThat(hash).isEqualTo(expected);
  }

  @Test
  void sha256HexHandlesNull() {
    assertThat(HashUtils.sha256Hex((String) null)).isNull();
    assertThat(HashUtils.sha256Hex((byte[]) null)).isNull();
  }

  @Test
  void sha256HexHandlesUnicode() {
    String hash = HashUtils.sha256Hex("Hello, 世界!");

    assertThat(hash).hasSize(64);
    assertThat(hash).matches("[a-f0-9]{64}");
  }

  @Test
  void sha256HexIsDeterministic() {
    String input = "deterministic test";

    String hash1 = HashUtils.sha256Hex(input);
    String hash2 = HashUtils.sha256Hex(input);

    assertThat(hash1).isEqualTo(hash2);
  }
}
