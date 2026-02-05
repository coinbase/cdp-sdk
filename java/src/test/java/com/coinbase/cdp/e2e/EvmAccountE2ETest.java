package com.coinbase.cdp.e2e;

import static org.assertj.core.api.Assertions.*;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.client.evm.EvmClientOptions.GetAccountOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.GetOrCreateAccountOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListAccountsOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.ListTokenBalancesOptions;
import com.coinbase.cdp.client.evm.EvmClientOptions.TransferOptions;
import com.coinbase.cdp.openapi.ApiException;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.EIP712Domain;
import com.coinbase.cdp.openapi.model.EIP712Message;
import com.coinbase.cdp.openapi.model.EvmAccount;
import com.coinbase.cdp.openapi.model.ListEvmTokenBalancesNetwork;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest;
import com.coinbase.cdp.openapi.model.SendEvmTransactionRequest;
import com.coinbase.cdp.openapi.model.SignEvmHashRequest;
import com.coinbase.cdp.openapi.model.SignEvmMessageRequest;
import com.coinbase.cdp.openapi.model.SignEvmTransactionRequest;
import com.coinbase.cdp.openapi.model.UpdateEvmAccountRequest;
import java.math.BigInteger;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.utils.Numeric;

/** E2E tests for EVM server account operations. */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class EvmAccountE2ETest {

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

    EvmAccount account =
        cdp.evm().createAccount(new CreateEvmAccountRequest().name(testAccountName));

    assertThat(account).isNotNull();
    assertThat(account.getAddress()).isNotBlank();
    assertThat(account.getAddress()).startsWith("0x");
    assertThat(account.getName()).isEqualTo(testAccountName);

    testAccountAddress = account.getAddress();
  }

  @Test
  @Order(2)
  void shouldGetAccountByAddress() throws Exception {
    EvmAccount account =
        cdp.evm().getAccount(GetAccountOptions.builder().address(testAccountAddress).build());

    assertThat(account).isNotNull();
    assertThat(account.getAddress()).isEqualTo(testAccountAddress);
    assertThat(account.getName()).isEqualTo(testAccountName);
  }

  @Test
  @Order(3)
  void shouldGetAccountByName() throws Exception {
    EvmAccount account =
        cdp.evm().getAccount(GetAccountOptions.builder().name(testAccountName).build());

    assertThat(account).isNotNull();
    assertThat(account.getAddress()).isEqualTo(testAccountAddress);
    assertThat(account.getName()).isEqualTo(testAccountName);
  }

  @Test
  @Order(4)
  void shouldListAccounts() throws Exception {
    var response = cdp.evm().listAccounts(ListAccountsOptions.builder().pageSize(10).build());

    assertThat(response).isNotNull();
    assertThat(response.getAccounts()).isNotEmpty();
  }

  @Test
  @Order(5)
  void shouldUpdateAccount() throws Exception {
    String newName = TestUtils.generateRandomName();

    EvmAccount updated =
        cdp.evm().updateAccount(testAccountAddress, new UpdateEvmAccountRequest().name(newName));

    assertThat(updated).isNotNull();
    assertThat(updated.getAddress()).isEqualTo(testAccountAddress);
    assertThat(updated.getName()).isEqualTo(newName);

    // Update our tracking variable
    testAccountName = newName;

    // Verify we can get by the new name
    EvmAccount byName = cdp.evm().getAccount(GetAccountOptions.builder().name(newName).build());
    assertThat(byName.getAddress()).isEqualTo(testAccountAddress);
  }

  @Test
  @Order(6)
  void shouldGetOrCreateAccount() throws Exception {
    String name = TestUtils.generateRandomName();

    // First call should create
    EvmAccount created =
        cdp.evm().getOrCreateAccount(GetOrCreateAccountOptions.builder().name(name).build());
    assertThat(created).isNotNull();
    assertThat(created.getName()).isEqualTo(name);

    // Second call should get the existing account
    EvmAccount existing =
        cdp.evm().getOrCreateAccount(GetOrCreateAccountOptions.builder().name(name).build());
    assertThat(existing).isNotNull();
    assertThat(existing.getAddress()).isEqualTo(created.getAddress());
    assertThat(existing.getName()).isEqualTo(name);
  }

  // ==================== Signing Operations ====================

  @Test
  @Order(10)
  void shouldSignHash() throws Exception {
    // Create a fresh account for signing tests
    EvmAccount account = cdp.evm().createAccount();
    String address = account.getAddress();

    // Create a 32-byte hash (64 hex chars after 0x)
    String hash = "0x" + "1".repeat(64);

    var result = cdp.evm().signHash(address, new SignEvmHashRequest().hash(hash));

    assertThat(result).isNotNull();
    assertThat(result.getSignature()).isNotBlank();
    assertThat(result.getSignature()).startsWith("0x");
  }

  @Test
  @Order(11)
  void shouldSignMessage() throws Exception {
    EvmAccount account = cdp.evm().createAccount();
    String address = account.getAddress();

    var result =
        cdp.evm().signMessage(address, new SignEvmMessageRequest().message("Hello from Java E2E!"));

    assertThat(result).isNotNull();
    assertThat(result.getSignature()).isNotBlank();
    assertThat(result.getSignature()).startsWith("0x");
  }

  @Test
  @Order(12)
  void shouldSignTransaction() throws Exception {
    EvmAccount account = cdp.evm().createAccount();
    String address = account.getAddress();

    // Create a valid EIP-1559 transaction using Web3j
    // Base Sepolia chain ID is 84532 (0x14A34)
    long chainId = 84532L;
    RawTransaction rawTransaction =
        RawTransaction.createEtherTransaction(
            chainId,
            BigInteger.ZERO, // nonce
            BigInteger.valueOf(21000), // gasLimit
            "0x0000000000000000000000000000000000000000", // to
            BigInteger.ZERO, // value
            BigInteger.valueOf(1000000000), // maxPriorityFeePerGas (1 gwei)
            BigInteger.valueOf(20000000000L) // maxFeePerGas (20 gwei)
            );

    // Encode the transaction (without signature) for EIP-1559
    byte[] encodedTx = TransactionEncoder.encode(rawTransaction);
    String transaction = Numeric.toHexString(encodedTx);

    var result =
        cdp.evm()
            .signTransaction(address, new SignEvmTransactionRequest().transaction(transaction));

    assertThat(result).isNotNull();
    assertThat(result.getSignedTransaction()).isNotBlank();
    assertThat(result.getSignedTransaction()).startsWith("0x");
  }

  @Test
  @Order(13)
  void shouldSignTypedData() throws Exception {
    EvmAccount account = cdp.evm().createAccount();
    String address = account.getAddress();

    // Create EIP-712 typed data
    EIP712Domain domain =
        new EIP712Domain()
            .name("TestApp")
            .version("1")
            .chainId(1L)
            .verifyingContract("0x0000000000000000000000000000000000000000");

    EIP712Message typedData =
        new EIP712Message()
            .domain(domain)
            .types(
                Map.of(
                    "EIP712Domain",
                    List.of(
                        Map.of("name", "name", "type", "string"),
                        Map.of("name", "version", "type", "string"),
                        Map.of("name", "chainId", "type", "uint256"),
                        Map.of("name", "verifyingContract", "type", "address")),
                    "Message",
                    List.of(Map.of("name", "content", "type", "string"))))
            .primaryType("Message")
            .message(Map.of("content", "Hello from Java E2E!"));

    var result = cdp.evm().signTypedData(address, typedData);

    assertThat(result).isNotNull();
    assertThat(result.getSignature()).isNotBlank();
    assertThat(result.getSignature()).startsWith("0x");
  }

  // ==================== Faucet ====================

  @Test
  @Order(20)
  void shouldRequestFaucet() throws Exception {
    EvmAccount account = cdp.evm().createAccount();

    var result =
        cdp.evm()
            .requestFaucet(
                new RequestEvmFaucetRequest()
                    .address(account.getAddress())
                    .network(RequestEvmFaucetRequest.NetworkEnum.BASE_SEPOLIA)
                    .token(RequestEvmFaucetRequest.TokenEnum.ETH));

    assertThat(result).isNotNull();
    assertThat(result.getTransactionHash()).isNotBlank();
    assertThat(result.getTransactionHash()).startsWith("0x");
  }

  // ==================== Token Balances ====================

  @Test
  @Order(30)
  void shouldListTokenBalances() throws Exception {
    EvmAccount account = cdp.evm().createAccount();

    var result =
        cdp.evm()
            .listTokenBalances(
                ListTokenBalancesOptions.builder()
                    .address(account.getAddress())
                    .network(ListEvmTokenBalancesNetwork.BASE_SEPOLIA)
                    .pageSize(10)
                    .build());

    assertThat(result).isNotNull();
    // Balances might be empty for a new account, but the response should be valid
    assertThat(result.getBalances()).isNotNull();
  }

  // ==================== Transactions and Transfers ====================

  @Test
  @Order(40)
  void shouldSendTransaction() throws Exception {
    // Create and fund an account
    EvmAccount account = cdp.evm().createAccount();
    String faucetTxHash;
    try {
      var faucetResponse =
          cdp.evm()
              .requestFaucet(
                  new RequestEvmFaucetRequest()
                      .address(account.getAddress())
                      .network(RequestEvmFaucetRequest.NetworkEnum.BASE_SEPOLIA)
                      .token(RequestEvmFaucetRequest.TokenEnum.ETH));
      faucetTxHash = faucetResponse.getTransactionHash();
    } catch (ApiException e) {
      // Skip test if faucet is rate limited
      Assumptions.assumeFalse(
          e.getMessage().contains("faucet_limit"), "Faucet rate limited - skipping test");
      throw e;
    }

    // Wait for faucet funds to be confirmed on-chain by polling for transaction receipt
    TestUtils.waitForTransactionReceipt(faucetTxHash);

    // Check balance before sending - skip test if funds haven't arrived
    var balances =
        cdp.evm()
            .listTokenBalances(
                ListTokenBalancesOptions.builder()
                    .address(account.getAddress())
                    .network(ListEvmTokenBalancesNetwork.BASE_SEPOLIA)
                    .build());
    boolean hasBalance =
        balances.getBalances().stream()
            .anyMatch(
                b ->
                    "ETH".equalsIgnoreCase(b.getToken().getSymbol())
                        && new BigInteger(b.getAmount().getAmount()).compareTo(BigInteger.ZERO)
                            > 0);
    Assumptions.assumeTrue(hasBalance, "Faucet funds not yet available - skipping test");

    // Create a valid EIP-1559 transaction using Web3j
    // Base Sepolia chain ID is 84532 (0x14A34)
    long chainId = 84532L;
    RawTransaction rawTransaction =
        RawTransaction.createEtherTransaction(
            chainId,
            BigInteger.ZERO, // nonce
            BigInteger.valueOf(21000), // gasLimit
            "0x0000000000000000000000000000000000000000", // to
            BigInteger.ZERO, // value
            BigInteger.valueOf(1000000000), // maxPriorityFeePerGas (1 gwei)
            BigInteger.valueOf(20000000000L) // maxFeePerGas (20 gwei)
            );

    // Encode the transaction (without signature) for EIP-1559
    byte[] encodedTx = TransactionEncoder.encode(rawTransaction);
    String transaction = Numeric.toHexString(encodedTx);

    try {
      var result =
          cdp.evm()
              .sendTransaction(
                  account.getAddress(),
                  new SendEvmTransactionRequest()
                      .network(SendEvmTransactionRequest.NetworkEnum.BASE_SEPOLIA)
                      .transaction(transaction));

      assertThat(result).isNotNull();
      assertThat(result.getTransactionHash()).isNotBlank();
      assertThat(result.getTransactionHash()).startsWith("0x");
    } catch (ApiException e) {
      // Skip test if insufficient balance (faucet funds not confirmed or insufficient)
      boolean insufficientBalance =
          e.getMessage().contains("Insufficient balance")
              || e.getMessage().contains("insufficient_funds");
      Assumptions.assumeFalse(
          insufficientBalance, "Insufficient balance for transaction - skipping test");
      throw e;
    }
  }

  @Test
  @Order(41)
  void shouldTransferEth() throws Exception {
    // Create and fund a source account
    EvmAccount sourceAccount = cdp.evm().createAccount();
    String faucetTxHash;
    try {
      var faucetResponse =
          cdp.evm()
              .requestFaucet(
                  new RequestEvmFaucetRequest()
                      .address(sourceAccount.getAddress())
                      .network(RequestEvmFaucetRequest.NetworkEnum.BASE_SEPOLIA)
                      .token(RequestEvmFaucetRequest.TokenEnum.ETH));
      faucetTxHash = faucetResponse.getTransactionHash();
    } catch (ApiException e) {
      // Skip test if faucet is rate limited
      Assumptions.assumeFalse(
          e.getMessage().contains("faucet_limit"), "Faucet rate limited - skipping test");
      throw e;
    }

    // Create destination account
    EvmAccount destAccount = cdp.evm().createAccount();

    // Wait for faucet funds to be confirmed on-chain by polling for transaction receipt
    TestUtils.waitForTransactionReceipt(faucetTxHash);

    try {
      var result =
          cdp.evm()
              .transfer(
                  sourceAccount.getAddress(),
                  TransferOptions.builder()
                      .to(destAccount.getAddress())
                      .amount(BigInteger.valueOf(1000)) // 1000 wei
                      .token("eth")
                      .network(SendEvmTransactionRequest.NetworkEnum.BASE_SEPOLIA)
                      .build());

      assertThat(result).isNotNull();
      assertThat(result.getTransactionHash()).isNotBlank();
      assertThat(result.getTransactionHash()).startsWith("0x");
    } catch (ApiException e) {
      // Skip test if insufficient balance (faucet may not have funds or state not propagated)
      boolean insufficientBalance =
          e.getMessage().contains("Insufficient balance")
              || e.getMessage().contains("insufficient_funds");
      Assumptions.assumeFalse(
          insufficientBalance, "Insufficient balance for transfer - skipping test");
      throw e;
    }
  }
}
