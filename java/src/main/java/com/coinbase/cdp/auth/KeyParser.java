package com.coinbase.cdp.auth;

import com.coinbase.cdp.auth.exceptions.KeyParseException;
import java.io.IOException;
import java.io.StringReader;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Security;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import org.bouncycastle.asn1.ASN1Sequence;
import org.bouncycastle.asn1.pkcs.PrivateKeyInfo;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.openssl.PEMKeyPair;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;

/**
 * Parses private keys from various formats.
 *
 * <p>Supports:
 *
 * <ul>
 *   <li>PEM-encoded EC keys (ES256)
 *   <li>Base64-encoded Ed25519 keys (64 bytes: 32-byte seed + 32-byte public key)
 *   <li>Base64-encoded PKCS#8 DER keys (for wallet secrets)
 * </ul>
 */
public final class KeyParser {

  static {
    if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
      Security.addProvider(new BouncyCastleProvider());
    }
  }

  private KeyParser() {}

  /**
   * Parses a private key from PEM (EC) or base64 (Ed25519) format.
   *
   * @param keyData the key data (PEM string or base64 encoded)
   * @return the parsed private key
   * @throws KeyParseException if parsing fails
   */
  public static PrivateKey parsePrivateKey(String keyData) {
    if (keyData == null || keyData.isBlank()) {
      throw new KeyParseException("Key data is required");
    }

    // Handle escaped newlines
    keyData = keyData.replace("\\n", "\n");

    // Try PEM EC key first
    if (keyData.contains("-----BEGIN")) {
      return parsePemKey(keyData);
    }

    // Try base64 Ed25519 key
    return parseEd25519Key(keyData);
  }

  /**
   * Parses a wallet secret (base64 DER-encoded EC key).
   *
   * @param walletSecret the base64-encoded PKCS#8 DER key
   * @return the parsed private key
   * @throws KeyParseException if parsing fails
   */
  public static PrivateKey parseWalletKey(String walletSecret) {
    if (walletSecret == null || walletSecret.isBlank()) {
      throw new KeyParseException("Wallet secret is required");
    }

    try {
      byte[] derBytes = Base64.getDecoder().decode(walletSecret);
      KeyFactory keyFactory = KeyFactory.getInstance("EC", BouncyCastleProvider.PROVIDER_NAME);
      PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(derBytes);
      return keyFactory.generatePrivate(spec);
    } catch (Exception e) {
      throw new KeyParseException("Failed to parse wallet key: " + e.getMessage(), e);
    }
  }

  /**
   * Determines if a key is an EC key (ES256).
   *
   * @param key the private key
   * @return true if the key uses EC algorithm
   */
  public static boolean isEcKey(PrivateKey key) {
    return "EC".equals(key.getAlgorithm()) || "ECDSA".equals(key.getAlgorithm());
  }

  /**
   * Determines if a key is an Ed25519 key (EdDSA).
   *
   * @param key the private key
   * @return true if the key uses Ed25519/EdDSA algorithm
   */
  public static boolean isEd25519Key(PrivateKey key) {
    String algorithm = key.getAlgorithm();
    return "Ed25519".equals(algorithm) || "EdDSA".equals(algorithm);
  }

  private static PrivateKey parsePemKey(String pemData) {
    try (PEMParser parser = new PEMParser(new StringReader(pemData))) {
      Object obj = parser.readObject();
      JcaPEMKeyConverter converter =
          new JcaPEMKeyConverter().setProvider(BouncyCastleProvider.PROVIDER_NAME);

      if (obj instanceof PEMKeyPair keyPair) {
        return converter.getPrivateKey(keyPair.getPrivateKeyInfo());
      } else if (obj instanceof PrivateKeyInfo privateKeyInfo) {
        return converter.getPrivateKey(privateKeyInfo);
      } else if (obj instanceof ASN1Sequence) {
        // Handle raw ASN.1 sequence
        PrivateKeyInfo privateKeyInfo = PrivateKeyInfo.getInstance(obj);
        return converter.getPrivateKey(privateKeyInfo);
      }

      throw new KeyParseException("Unsupported PEM format: " + obj.getClass().getName());
    } catch (IOException e) {
      throw new KeyParseException("Failed to parse PEM key: " + e.getMessage(), e);
    }
  }

  private static PrivateKey parseEd25519Key(String base64Key) {
    try {
      byte[] decoded = Base64.getDecoder().decode(base64Key);
      if (decoded.length != 64) {
        throw new KeyParseException(
            "Invalid Ed25519 key length: expected 64 bytes, got " + decoded.length);
      }

      // First 32 bytes are the seed (private key), last 32 are the public key
      byte[] seed = new byte[32];
      System.arraycopy(decoded, 0, seed, 0, 32);

      // Create Ed25519 private key using BouncyCastle
      // Ed25519 PKCS#8 format: prefix + seed
      byte[] pkcs8Prefix =
          new byte[] {
            0x30,
            0x2e, // SEQUENCE, length 46
            0x02,
            0x01,
            0x00, // INTEGER 0 (version)
            0x30,
            0x05, // SEQUENCE, length 5
            0x06,
            0x03,
            0x2b,
            0x65,
            0x70, // OID 1.3.101.112 (Ed25519)
            0x04,
            0x22, // OCTET STRING, length 34
            0x04,
            0x20 // OCTET STRING, length 32 (the seed)
          };

      byte[] pkcs8Key = new byte[pkcs8Prefix.length + seed.length];
      System.arraycopy(pkcs8Prefix, 0, pkcs8Key, 0, pkcs8Prefix.length);
      System.arraycopy(seed, 0, pkcs8Key, pkcs8Prefix.length, seed.length);

      KeyFactory keyFactory = KeyFactory.getInstance("Ed25519", BouncyCastleProvider.PROVIDER_NAME);
      PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(pkcs8Key);
      return keyFactory.generatePrivate(spec);
    } catch (KeyParseException e) {
      throw e;
    } catch (Exception e) {
      throw new KeyParseException("Failed to parse Ed25519 key: " + e.getMessage(), e);
    }
  }
}
