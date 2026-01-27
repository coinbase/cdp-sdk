package com.coinbase.cdp.examples.evm;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.CdpTokenGenerator;
import com.coinbase.cdp.auth.CdpTokenRequest;
import com.coinbase.cdp.auth.CdpTokenResponse;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.ApiClient;
import com.coinbase.cdp.openapi.api.EvmAccountsApi;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import java.util.Optional;

/**
 * Example: Create an EVM account.
 *
 * <p>This example demonstrates how to create a new EVM account using the CDP SDK.
 *
 * <p>Usage: ./gradlew runCreateEvmAccount
 */
public class CreateAccount {

    public static void main(String[] args) throws Exception {
        EnvLoader.load();

        // Create an account with a unique name
        String accountName = "java-example-" + System.currentTimeMillis();
        var request = new CreateEvmAccountRequest().name(accountName);

        CdpTokenGenerator tokenGenerator = new CdpTokenGenerator(
            System.getenv("CDP_API_KEY_ID"),
            System.getenv("CDP_API_KEY_SECRET"),
            Optional.ofNullable(System.getenv("CDP_WALLET_SECRET"))
        );

        CdpTokenRequest req = CdpTokenRequest.builder()
            .requestBody(request)
            .requestPath("/v2/evm/accounts")
            .requestMethod("POST")
            .includeWalletAuthToken(true)
            .build();

        CdpTokenResponse tokens = tokenGenerator.generateTokens(req);
        ApiClient apiClient = CdpClient.createApiClientWithTokens(tokens);
        EvmAccountsApi evmApi = new EvmAccountsApi(apiClient);

        // Create the account
        var account = evmApi.createEvmAccount(null, null, request);

        System.out.println("Created EVM account:");
        System.out.println("  Address: " + account.getAddress());
        System.out.println("  Name: " + account.getName());
    }
}
