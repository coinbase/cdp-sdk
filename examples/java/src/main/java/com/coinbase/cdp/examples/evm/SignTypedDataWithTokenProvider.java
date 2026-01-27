package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.CdpTokenGenerator;
import com.coinbase.cdp.auth.CdpTokenRequest;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.EIP712Domain;
import com.coinbase.cdp.openapi.model.EIP712Message;
import com.coinbase.cdp.openapi.model.EvmAccount;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Example: Sign EIP-712 typed data using the TokenProvider pattern.
 *
 * <p>This example demonstrates how to use the CdpTokenGenerator to generate tokens for each API
 * request, then use the static factory pattern CdpClient.evm(tokenProvider) to make API calls.
 *
 * <p>Key concepts demonstrated:
 *
 * <ol>
 *   <li><strong>CdpTokenGenerator</strong> - Generates bearer tokens and wallet JWTs for API calls
 *   <li><strong>TokenProvider interface</strong> - Abstraction for token sources
 *   <li><strong>Request-specific tokens</strong> - Each write operation requires its own tokens
 *       because wallet JWTs include the request method, path, and body hash
 *   <li><strong>Static factory pattern</strong> - Using CdpClient.evm(tokens) instead of
 *       CdpClient.create().evm()
 * </ol>
 *
 * <p><strong>Important:</strong> Pre-generated wallet JWTs are request-specific. Each operation
 * (createAccount, signTypedData, etc.) needs tokens generated for that specific request because the
 * wallet JWT includes the HTTP method, path, and body hash.
 *
 * <p>Usage: ./gradlew runSignTypedDataWithTokenProvider
 */
public class SignTypedDataWithTokenProvider {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    System.out.println("=== TokenProvider Pattern with CdpTokenGenerator ===");
    System.out.println();
    System.out.println("This example shows how to use CdpTokenGenerator to generate");
    System.out.println("request-specific tokens and use CdpClient.evm(tokenProvider)");
    System.out.println("for API calls.");
    System.out.println();

    // Create a token generator from environment/system properties
    // EnvLoader sets values as system properties, so we check both
    String apiKeyId = getEnvOrProperty("CDP_API_KEY_ID");
    String apiKeySecret = getEnvOrProperty("CDP_API_KEY_SECRET");
    String walletSecret = getEnvOrProperty("CDP_WALLET_SECRET");

    CdpTokenGenerator tokenGenerator =
        new CdpTokenGenerator(apiKeyId, apiKeySecret, Optional.ofNullable(walletSecret));

    String accountName = "eip712-" + (System.currentTimeMillis() % 1000000);

    // ==================== Step 1: Create EVM Account ====================
    System.out.println("Step 1: Create EVM Account using TokenProvider pattern");
    System.out.println();

    // Prepare the create account request
    CreateEvmAccountRequest createAccountRequest = new CreateEvmAccountRequest().name(accountName);

    // Generate tokens specifically for the createAccount operation
    // Note: Path must include /platform prefix to match the actual API endpoint
    System.out.println("  Generating tokens for POST /platform/v2/evm/accounts...");
    CdpTokenRequest createTokenReq =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestPath("/platform/v2/evm/accounts")
            .requestHost("api.cdp.coinbase.com")
            .includeWalletAuthToken(true)
            .requestBody(createAccountRequest)
            .build();

    TokenProvider createTokens = tokenGenerator.generateTokens(createTokenReq);
    System.out.println("  ✓ Bearer token generated");
    System.out.println(
        "  ✓ Wallet auth token generated: " + createTokens.walletAuthToken().isPresent());

    // Use the static factory pattern with the generated tokens
    System.out.println("  Calling CdpClient.evm(tokens).createAccount(...)");
    EvmAccount account = CdpClient.evm(createTokens).createAccount(createAccountRequest);

    System.out.println();
    System.out.println("  ✓ Created account: " + account.getAddress());
    System.out.println("  ✓ Account name: " + account.getName());
    System.out.println();

    // ==================== Step 2: Prepare EIP-712 Typed Data ====================
    System.out.println("Step 2: Prepare EIP-712 Typed Data");
    System.out.println();

    // Define the EIP-712 domain
    EIP712Domain domain =
        new EIP712Domain()
            .name("MyDApp")
            .version("1")
            .chainId(1L)
            .verifyingContract("0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC");

    // Define the types (type definitions for the structured data)
    Map<String, Object> types = new LinkedHashMap<>();

    // EIP712Domain type definition
    types.put(
        "EIP712Domain",
        List.of(
            Map.of("name", "name", "type", "string"),
            Map.of("name", "version", "type", "string"),
            Map.of("name", "chainId", "type", "uint256"),
            Map.of("name", "verifyingContract", "type", "address")));

    // Mail type definition (example structured data type)
    types.put(
        "Mail",
        List.of(
            Map.of("name", "from", "type", "Person"),
            Map.of("name", "to", "type", "Person"),
            Map.of("name", "contents", "type", "string")));

    // Person type definition
    types.put(
        "Person",
        List.of(
            Map.of("name", "name", "type", "string"), Map.of("name", "wallet", "type", "address")));

    // Define the actual message data
    Map<String, Object> message = new LinkedHashMap<>();
    message.put("from", Map.of("name", "Alice", "wallet", account.getAddress()));
    message.put(
        "to", Map.of("name", "Bob", "wallet", "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"));
    message.put("contents", "Hello, Bob!");

    // Create the EIP-712 message
    EIP712Message eip712Message =
        new EIP712Message().domain(domain).types(types).primaryType("Mail").message(message);

    System.out.println("  ✓ Prepared EIP-712 typed data:");
    System.out.println("    Primary Type: Mail");
    System.out.println("    Domain: MyDApp v1 on chain 1");
    System.out.println("    Message: Alice → Bob: \"Hello, Bob!\"");
    System.out.println();

    // ==================== Step 3: Sign Typed Data ====================
    System.out.println("Step 3: Sign EIP-712 Typed Data using TokenProvider pattern");
    System.out.println();

    // IMPORTANT: Generate NEW tokens for signTypedData operation
    // Wallet JWTs are request-specific and include the method, path, and body hash
    // Note: Path must include /platform prefix to match the actual API endpoint
    String signPath = "/platform/v2/evm/accounts/" + account.getAddress() + "/sign/typed-data";
    System.out.println("  Generating NEW tokens for POST " + signPath + "...");

    CdpTokenRequest signTokenReq =
        CdpTokenRequest.builder()
            .requestMethod("POST")
            .requestPath(signPath)
            .requestHost("api.cdp.coinbase.com")
            .includeWalletAuthToken(true)
            .requestBody(eip712Message)
            .build();

    TokenProvider signTokens = tokenGenerator.generateTokens(signTokenReq);
    System.out.println("  ✓ Bearer token generated");
    System.out.println(
        "  ✓ Wallet auth token generated: " + signTokens.walletAuthToken().isPresent());

    // Use the static factory pattern with the new tokens
    System.out.println("  Calling CdpClient.evm(tokens).signTypedData(...)");
    var signature = CdpClient.evm(signTokens).signTypedData(account.getAddress(), eip712Message);

    System.out.println();
    System.out.println("  ✓ Successfully signed EIP-712 typed data!");
    System.out.println("  ✓ Signature: " + signature.getSignature());
    System.out.println();

    // ==================== Summary ====================
    System.out.println("=== Summary ===");
    System.out.println();
    System.out.println("This example demonstrated:");
    System.out.println("1. Using CdpTokenGenerator to generate request-specific tokens");
    System.out.println("2. Using CdpClient.evm(tokenProvider) static factory pattern");
    System.out.println("3. Generating NEW tokens for each write operation");
    System.out.println("4. EIP-712 typed data construction and signing");
    System.out.println();
    System.out.println("Key takeaways:");
    System.out.println("- Each write operation needs its own TokenProvider with fresh tokens");
    System.out.println("- Wallet JWTs include method, path, and body hash - they're request-specific");
    System.out.println("- The TokenProvider interface enables integration with external systems");
    System.out.println("- Use CdpClient.evm(tokens) for the static factory pattern");
  }

  /** Gets a value from environment variable or system property. */
  private static String getEnvOrProperty(String name) {
    String value = System.getenv(name);
    if (value == null || value.isEmpty()) {
      value = System.getProperty(name);
    }
    return value;
  }
}
