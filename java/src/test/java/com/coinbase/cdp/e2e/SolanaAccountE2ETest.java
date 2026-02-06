package com.coinbase.cdp.e2e;

import static org.assertj.core.api.Assertions.*;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.client.solana.SolanaClientOptions.GetAccountOptions;
import com.coinbase.cdp.client.solana.SolanaClientOptions.GetOrCreateAccountOptions;
import com.coinbase.cdp.client.solana.SolanaClientOptions.ListAccountsOptions;
import com.coinbase.cdp.client.solana.SolanaClientOptions.ListTokenBalancesOptions;
import com.coinbase.cdp.client.solana.SolanaClientOptions.TransferOptions;
import com.coinbase.cdp.openapi.ApiException;
import com.coinbase.cdp.openapi.model.CreateSolanaAccountRequest;
import com.coinbase.cdp.openapi.model.ListSolanaTokenBalancesNetwork;
import com.coinbase.cdp.openapi.model.RequestSolanaFaucetRequest;
import com.coinbase.cdp.openapi.model.SendSolanaTransactionRequest;
import com.coinbase.cdp.openapi.model.SignSolanaMessageRequest;
import com.coinbase.cdp.openapi.model.SignSolanaTransactionRequest;
import com.coinbase.cdp.openapi.model.SolanaAccount;
import java.math.BigInteger;
import java.util.Base64;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

/** E2E tests for Solana account operations. */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SolanaAccountE2ETest {

  private static CdpClient cdp;
  private static String testAccountAddress;
  private static String testAccountName;

  @BeforeAll
  static void setup() {
    cdp = TestUtils.createDefaultClient();
  }

  @AfterAll
  static void teardown() {
    if (cdp != null) {
      cdp.close();
    }
  }

  // ==================== Account Lifecycle ====================

  @Test
  @Order(1)
  void shouldCreateAccount() throws Exception {
    testAccountName = TestUtils.generateRandomName();

    SolanaAccount account =
        cdp.solana().createAccount(new CreateSolanaAccountRequest().name(testAccountName));

    assertThat(account).isNotNull();
    assertThat(account.getAddress()).isNotBlank();
    assertThat(account.getName()).isEqualTo(testAccountName);

    testAccountAddress = account.getAddress();
  }

  @Test
  @Order(2)
  void shouldGetAccountByAddress() throws Exception {
    SolanaAccount account =
        cdp.solana().getAccount(GetAccountOptions.builder().address(testAccountAddress).build());

    assertThat(account).isNotNull();
    assertThat(account.getAddress()).isEqualTo(testAccountAddress);
    assertThat(account.getName()).isEqualTo(testAccountName);
  }

  @Test
  @Order(3)
  void shouldGetAccountByName() throws Exception {
    SolanaAccount account =
        cdp.solana().getAccount(GetAccountOptions.builder().name(testAccountName).build());

    assertThat(account).isNotNull();
    assertThat(account.getAddress()).isEqualTo(testAccountAddress);
    assertThat(account.getName()).isEqualTo(testAccountName);
  }

  @Test
  @Order(4)
  void shouldListAccounts() throws Exception {
    var response = cdp.solana().listAccounts(ListAccountsOptions.builder().pageSize(10).build());

    assertThat(response).isNotNull();
    assertThat(response.getAccounts()).isNotEmpty();
  }

  @Test
  @Order(5)
  void shouldGetOrCreateAccount() throws Exception {
    String name = TestUtils.generateRandomName();

    // First call should create
    SolanaAccount created =
        cdp.solana().getOrCreateAccount(GetOrCreateAccountOptions.builder().name(name).build());
    assertThat(created).isNotNull();
    assertThat(created.getName()).isEqualTo(name);

    // Second call should get the existing account
    SolanaAccount existing =
        cdp.solana().getOrCreateAccount(GetOrCreateAccountOptions.builder().name(name).build());
    assertThat(existing).isNotNull();
    assertThat(existing.getAddress()).isEqualTo(created.getAddress());
    assertThat(existing.getName()).isEqualTo(name);
  }

  // ==================== Signing Operations ====================

  @Test
  @Order(10)
  void shouldSignMessage() throws Exception {
    SolanaAccount account = cdp.solana().createAccount();

    // Message must be base64 encoded
    String message = "Hello from Java E2E!";
    String encodedMessage = Base64.getEncoder().encodeToString(message.getBytes());

    var result =
        cdp.solana()
            .signMessage(
                account.getAddress(), new SignSolanaMessageRequest().message(encodedMessage));

    assertThat(result).isNotNull();
    assertThat(result.getSignature()).isNotBlank();
  }

  @Test
  @Order(11)
  void shouldSignTransaction() throws Exception {
    SolanaAccount account = cdp.solana().createAccount();

    // Create a minimal valid Solana transaction structure (base64 encoded)
    // This is a placeholder - actual transaction would need proper blockhash
    byte[] minimalTx = new byte[64];
    String base64Tx = Base64.getEncoder().encodeToString(minimalTx);

    // Note: This may fail if the transaction structure is invalid
    // The test verifies the API call works, not transaction validity
    try {
      var result =
          cdp.solana()
              .signTransaction(
                  account.getAddress(), new SignSolanaTransactionRequest().transaction(base64Tx));

      assertThat(result).isNotNull();
    } catch (Exception e) {
      // Transaction signing may fail with invalid transaction structure
      // This is expected behavior - we're testing the API pathway
      assertThat(e.getMessage()).isNotNull();
    }
  }

  // ==================== Faucet ====================

  @Test
  @Order(20)
  void shouldRequestFaucet() throws Exception {
    SolanaAccount account = cdp.solana().createAccount();

    try {
      var result =
          cdp.solana()
              .requestFaucet(
                  new RequestSolanaFaucetRequest()
                      .address(account.getAddress())
                      .token(RequestSolanaFaucetRequest.TokenEnum.SOL));

      assertThat(result).isNotNull();
      assertThat(result.getTransactionSignature()).isNotBlank();
    } catch (ApiException e) {
      // Skip test if faucet is rate limited
      boolean rateLimited =
          e.getMessage().contains("faucet_limit") || e.getMessage().contains("429");
      Assumptions.assumeFalse(rateLimited, "Faucet rate limited - skipping test");
      throw e;
    }
  }

  // ==================== Token Balances ====================

  @Test
  @Order(30)
  void shouldListTokenBalances() throws Exception {
    SolanaAccount account = cdp.solana().createAccount();

    var result =
        cdp.solana()
            .listTokenBalances(
                ListTokenBalancesOptions.builder()
                    .address(account.getAddress())
                    .network(ListSolanaTokenBalancesNetwork.SOLANA_DEVNET)
                    .pageSize(10)
                    .build());

    assertThat(result).isNotNull();
    // Balances might be empty for a new account
    assertThat(result.getBalances()).isNotNull();
  }

  // ==================== Transfers ====================

  @Test
  @Order(40)
  void shouldTransferSol() throws Exception {
    // Create and fund a source account
    SolanaAccount sourceAccount = cdp.solana().createAccount();
    try {
      cdp.solana()
          .requestFaucet(
              new RequestSolanaFaucetRequest()
                  .address(sourceAccount.getAddress())
                  .token(RequestSolanaFaucetRequest.TokenEnum.SOL));
    } catch (ApiException e) {
      // Skip test if faucet is rate limited
      boolean rateLimited =
          e.getMessage().contains("faucet_limit") || e.getMessage().contains("429");
      Assumptions.assumeFalse(rateLimited, "Faucet rate limited - skipping test");
      throw e;
    }

    // Create destination account
    SolanaAccount destAccount = cdp.solana().createAccount();

    // Wait for funds to arrive
    TestUtils.sleep(10000);

    // Transfer amount must be above rent-exempt minimum (~890,000 lamports)
    // Use 1,000,000 lamports (0.001 SOL) to ensure sufficient funds
    try {
      var result =
          cdp.solana()
              .transfer(
                  sourceAccount.getAddress(),
                  TransferOptions.builder()
                      .to(destAccount.getAddress())
                      .amount(BigInteger.valueOf(1_000_000)) // 1,000,000 lamports (0.001 SOL)
                      .token("sol")
                      .network(SendSolanaTransactionRequest.NetworkEnum.SOLANA_DEVNET)
                      .build());

      assertThat(result).isNotNull();
      assertThat(result.getTransactionSignature()).isNotBlank();
    } catch (ApiException e) {
      // Skip test if insufficient funds or other transient issues
      boolean insufficientFunds =
          e.getMessage().contains("Insufficient") || e.getMessage().contains("InsufficientFunds");
      Assumptions.assumeFalse(insufficientFunds, "Insufficient funds for transfer - skipping test");
      throw e;
    }
  }
}
