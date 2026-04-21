package com.coinbase.cdp.client.enduser;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.client.enduser.EndUserClientOptions.ListEndUsersOptions;
import com.coinbase.cdp.openapi.ApiClient;
import com.coinbase.cdp.openapi.ApiException;
import com.coinbase.cdp.openapi.api.EmbeddedWalletsApi;
import com.coinbase.cdp.openapi.api.EndUserAccountsApi;
import com.coinbase.cdp.openapi.model.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class EndUserClientTest {

  private static final String USER_ID = "test-user-id";
  private static final String EVM_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
  private static final String SOLANA_ADDRESS = "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV";
  private static final String ASSET = "usdc";
  private static final String WALLET_JWT = "mock-wallet-jwt";
  private static final String IDEMPOTENCY_KEY = "test-idempotency-key";

  private EndUserAccountsApi endUserAccountsApi;
  private EmbeddedWalletsApi embeddedWalletsApi;
  private EndUserClient client;

  @BeforeEach
  void setUp() {
    endUserAccountsApi = mock(EndUserAccountsApi.class);
    embeddedWalletsApi = mock(EmbeddedWalletsApi.class);

    // Create client using CdpClient constructor, then replace APIs via reflection
    CdpClient cdpClient = mock(CdpClient.class);
    when(cdpClient.getApiClient()).thenReturn(mock(ApiClient.class));
    when(cdpClient.generateWalletJwt(anyString(), anyString(), any())).thenReturn(WALLET_JWT);

    client = new EndUserClient(cdpClient);

    // Replace the generated API instances with mocks
    try {
      var endUserAccountsField = EndUserClient.class.getDeclaredField("endUserAccountsApi");
      endUserAccountsField.setAccessible(true);
      endUserAccountsField.set(client, endUserAccountsApi);

      var embeddedWalletsField = EndUserClient.class.getDeclaredField("embeddedWalletsApi");
      embeddedWalletsField.setAccessible(true);
      embeddedWalletsField.set(client, embeddedWalletsApi);
    } catch (Exception e) {
      throw new RuntimeException("Failed to inject mock APIs", e);
    }
  }

  // ==================== CRUD Operations ====================

  @Nested
  class CreateEndUser {
    @Test
    void createsEndUserWithRequest() throws ApiException {
      EndUser expected = new EndUser().userId(USER_ID);
      CreateEndUserRequest request = new CreateEndUserRequest().userId(USER_ID);
      when(endUserAccountsApi.createEndUser(eq(WALLET_JWT), isNull(), any())).thenReturn(expected);

      EndUser result = client.createEndUser(request);

      assertThat(result).isEqualTo(expected);
      verify(endUserAccountsApi).createEndUser(eq(WALLET_JWT), isNull(), eq(request));
    }

    @Test
    void createsEndUserWithIdempotencyKey() throws ApiException {
      EndUser expected = new EndUser().userId(USER_ID);
      CreateEndUserRequest request = new CreateEndUserRequest().userId(USER_ID);
      when(endUserAccountsApi.createEndUser(eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), any()))
          .thenReturn(expected);

      EndUser result = client.createEndUser(request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
      verify(endUserAccountsApi).createEndUser(eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), eq(request));
    }

    @Test
    void generatesUserIdIfNotSet() throws ApiException {
      EndUser expected = new EndUser().userId("generated-id");
      CreateEndUserRequest request = new CreateEndUserRequest();
      when(endUserAccountsApi.createEndUser(eq(WALLET_JWT), isNull(), any())).thenReturn(expected);

      client.createEndUser(request);

      assertThat(request.getUserId()).isNotNull();
    }
  }

  @Nested
  class ListEndUsersTest {
    @Test
    void listsEndUsersWithDefaults() throws ApiException {
      ListEndUsers200Response expected = new ListEndUsers200Response();
      when(endUserAccountsApi.listEndUsers(isNull(), isNull(), isNull())).thenReturn(expected);

      ListEndUsers200Response result = client.listEndUsers();

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void listsEndUsersWithOptions() throws ApiException {
      List<String> sort = List.of("asc");
      ListEndUsers200Response expected = new ListEndUsers200Response();
      ListEndUsersOptions options =
          ListEndUsersOptions.builder().pageSize(10).pageToken("token").sort(sort).build();
      when(endUserAccountsApi.listEndUsers(10, "token", sort)).thenReturn(expected);

      ListEndUsers200Response result = client.listEndUsers(options);

      assertThat(result).isEqualTo(expected);
      verify(endUserAccountsApi).listEndUsers(10, "token", sort);
    }
  }

  @Nested
  class GetEndUserTest {
    @Test
    void getsEndUserById() throws ApiException {
      EndUser expected = new EndUser().userId(USER_ID);
      when(endUserAccountsApi.getEndUser(USER_ID)).thenReturn(expected);

      EndUser result = client.getEndUser(USER_ID);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class ValidateAccessTokenTest {
    @Test
    void validatesAccessToken() throws ApiException {
      EndUser expected = new EndUser().userId(USER_ID);
      ValidateEndUserAccessTokenRequest request =
          new ValidateEndUserAccessTokenRequest().accessToken("test-token");
      when(endUserAccountsApi.validateEndUserAccessToken(request)).thenReturn(expected);

      EndUser result = client.validateAccessToken(request);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class ImportEndUserTest {
    @Test
    void importsEndUser() throws ApiException {
      EndUser expected = new EndUser().userId(USER_ID);
      ImportEndUserRequest request =
          new ImportEndUserRequest().userId(USER_ID).encryptedPrivateKey("encrypted-key");
      when(endUserAccountsApi.importEndUser(eq(WALLET_JWT), isNull(), any())).thenReturn(expected);

      EndUser result = client.importEndUser(request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void importsEndUserWithIdempotencyKey() throws ApiException {
      EndUser expected = new EndUser().userId(USER_ID);
      ImportEndUserRequest request =
          new ImportEndUserRequest().userId(USER_ID).encryptedPrivateKey("encrypted-key");
      when(endUserAccountsApi.importEndUser(eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), any()))
          .thenReturn(expected);

      EndUser result = client.importEndUser(request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void generatesUserIdIfNotSet() throws ApiException {
      EndUser expected = new EndUser();
      ImportEndUserRequest request =
          new ImportEndUserRequest().encryptedPrivateKey("encrypted-key");
      when(endUserAccountsApi.importEndUser(eq(WALLET_JWT), isNull(), any())).thenReturn(expected);

      client.importEndUser(request);

      assertThat(request.getUserId()).isNotNull();
    }
  }

  @Nested
  class AddEndUserEvmAccountTest {
    @Test
    void addsEvmAccount() throws ApiException {
      AddEndUserEvmAccount201Response expected = new AddEndUserEvmAccount201Response();
      when(endUserAccountsApi.addEndUserEvmAccount(eq(USER_ID), eq(WALLET_JWT), isNull(), any()))
          .thenReturn(expected);

      AddEndUserEvmAccount201Response result = client.addEndUserEvmAccount(USER_ID);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void addsEvmAccountWithIdempotencyKey() throws ApiException {
      AddEndUserEvmAccount201Response expected = new AddEndUserEvmAccount201Response();
      when(endUserAccountsApi.addEndUserEvmAccount(
              eq(USER_ID), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), any()))
          .thenReturn(expected);

      AddEndUserEvmAccount201Response result =
          client.addEndUserEvmAccount(USER_ID, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class AddEndUserEvmSmartAccountTest {
    @Test
    void addsEvmSmartAccount() throws ApiException {
      AddEndUserEvmSmartAccount201Response expected = new AddEndUserEvmSmartAccount201Response();
      AddEndUserEvmSmartAccountRequest request = new AddEndUserEvmSmartAccountRequest();
      when(endUserAccountsApi.addEndUserEvmSmartAccount(
              eq(USER_ID), eq(WALLET_JWT), isNull(), eq(request)))
          .thenReturn(expected);

      AddEndUserEvmSmartAccount201Response result =
          client.addEndUserEvmSmartAccount(USER_ID, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void addsEvmSmartAccountWithIdempotencyKey() throws ApiException {
      AddEndUserEvmSmartAccount201Response expected = new AddEndUserEvmSmartAccount201Response();
      AddEndUserEvmSmartAccountRequest request = new AddEndUserEvmSmartAccountRequest();
      when(endUserAccountsApi.addEndUserEvmSmartAccount(
              eq(USER_ID), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), eq(request)))
          .thenReturn(expected);

      AddEndUserEvmSmartAccount201Response result =
          client.addEndUserEvmSmartAccount(USER_ID, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class AddEndUserSolanaAccountTest {
    @Test
    void addsSolanaAccount() throws ApiException {
      AddEndUserSolanaAccount201Response expected = new AddEndUserSolanaAccount201Response();
      when(endUserAccountsApi.addEndUserSolanaAccount(eq(USER_ID), eq(WALLET_JWT), isNull(), any()))
          .thenReturn(expected);

      AddEndUserSolanaAccount201Response result = client.addEndUserSolanaAccount(USER_ID);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void addsSolanaAccountWithIdempotencyKey() throws ApiException {
      AddEndUserSolanaAccount201Response expected = new AddEndUserSolanaAccount201Response();
      when(endUserAccountsApi.addEndUserSolanaAccount(
              eq(USER_ID), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), any()))
          .thenReturn(expected);

      AddEndUserSolanaAccount201Response result =
          client.addEndUserSolanaAccount(USER_ID, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  // ==================== Delegation Management ====================

  @Nested
  class RevokeDelegationTest {
    @Test
    void revokesDelegation() throws ApiException {
      client.revokeDelegation(USER_ID);

      verify(embeddedWalletsApi)
          .revokeDelegationForEndUser(
              eq(USER_ID),
              any(RevokeDelegationForEndUserRequest.class),
              eq(WALLET_JWT),
              isNull(),
              isNull());
    }
  }

  // ==================== Delegated EVM Sign Methods ====================

  @Nested
  class SignEvmTransactionTest {
    @Test
    void signsEvmTransaction() throws ApiException {
      SignEvmTransactionWithEndUserAccount200Response expected =
          new SignEvmTransactionWithEndUserAccount200Response();
      SignEvmTransactionWithEndUserAccountRequest request =
          new SignEvmTransactionWithEndUserAccountRequest();
      when(embeddedWalletsApi.signEvmTransactionWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), isNull(), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SignEvmTransactionWithEndUserAccount200Response result =
          client.signEvmTransaction(USER_ID, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void signsEvmTransactionWithIdempotencyKey() throws ApiException {
      SignEvmTransactionWithEndUserAccount200Response expected =
          new SignEvmTransactionWithEndUserAccount200Response();
      SignEvmTransactionWithEndUserAccountRequest request =
          new SignEvmTransactionWithEndUserAccountRequest();
      when(embeddedWalletsApi.signEvmTransactionWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SignEvmTransactionWithEndUserAccount200Response result =
          client.signEvmTransaction(USER_ID, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class SignEvmMessageTest {
    @Test
    void signsEvmMessage() throws ApiException {
      SignEvmMessageWithEndUserAccount200Response expected =
          new SignEvmMessageWithEndUserAccount200Response();
      SignEvmMessageWithEndUserAccountRequest request =
          new SignEvmMessageWithEndUserAccountRequest();
      when(embeddedWalletsApi.signEvmMessageWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), isNull(), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SignEvmMessageWithEndUserAccount200Response result = client.signEvmMessage(USER_ID, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void signsEvmMessageWithIdempotencyKey() throws ApiException {
      SignEvmMessageWithEndUserAccount200Response expected =
          new SignEvmMessageWithEndUserAccount200Response();
      SignEvmMessageWithEndUserAccountRequest request =
          new SignEvmMessageWithEndUserAccountRequest();
      when(embeddedWalletsApi.signEvmMessageWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SignEvmMessageWithEndUserAccount200Response result =
          client.signEvmMessage(USER_ID, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class SignEvmTypedDataTest {
    @Test
    void signsEvmTypedData() throws ApiException {
      SignEvmTypedDataWithEndUserAccount200Response expected =
          new SignEvmTypedDataWithEndUserAccount200Response();
      SignEvmTypedDataWithEndUserAccountRequest request =
          new SignEvmTypedDataWithEndUserAccountRequest();
      when(embeddedWalletsApi.signEvmTypedDataWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), isNull(), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SignEvmTypedDataWithEndUserAccount200Response result =
          client.signEvmTypedData(USER_ID, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void signsEvmTypedDataWithIdempotencyKey() throws ApiException {
      SignEvmTypedDataWithEndUserAccount200Response expected =
          new SignEvmTypedDataWithEndUserAccount200Response();
      SignEvmTypedDataWithEndUserAccountRequest request =
          new SignEvmTypedDataWithEndUserAccountRequest();
      when(embeddedWalletsApi.signEvmTypedDataWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SignEvmTypedDataWithEndUserAccount200Response result =
          client.signEvmTypedData(USER_ID, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  // ==================== Delegated EVM Send Methods ====================

  @Nested
  class SendEvmTransactionTest {
    @Test
    void sendsEvmTransaction() throws ApiException {
      SendEvmTransactionWithEndUserAccount200Response expected =
          new SendEvmTransactionWithEndUserAccount200Response();
      SendEvmTransactionWithEndUserAccountRequest request =
          new SendEvmTransactionWithEndUserAccountRequest();
      when(embeddedWalletsApi.sendEvmTransactionWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), isNull(), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SendEvmTransactionWithEndUserAccount200Response result =
          client.sendEvmTransaction(USER_ID, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void sendsEvmTransactionWithIdempotencyKey() throws ApiException {
      SendEvmTransactionWithEndUserAccount200Response expected =
          new SendEvmTransactionWithEndUserAccount200Response();
      SendEvmTransactionWithEndUserAccountRequest request =
          new SendEvmTransactionWithEndUserAccountRequest();
      when(embeddedWalletsApi.sendEvmTransactionWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SendEvmTransactionWithEndUserAccount200Response result =
          client.sendEvmTransaction(USER_ID, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class SendEvmAssetTest {
    @Test
    void sendsEvmAsset() throws ApiException {
      SendEvmAssetWithEndUserAccount200Response expected =
          new SendEvmAssetWithEndUserAccount200Response();
      SendEvmAssetWithEndUserAccountRequest request = new SendEvmAssetWithEndUserAccountRequest();
      when(embeddedWalletsApi.sendEvmAssetWithEndUserAccount(
              eq(USER_ID),
              eq(EVM_ADDRESS),
              eq(ASSET),
              eq(WALLET_JWT),
              isNull(),
              isNull(),
              isNull(),
              eq(request)))
          .thenReturn(expected);

      SendEvmAssetWithEndUserAccount200Response result =
          client.sendEvmAsset(USER_ID, EVM_ADDRESS, ASSET, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void sendsEvmAssetWithIdempotencyKey() throws ApiException {
      SendEvmAssetWithEndUserAccount200Response expected =
          new SendEvmAssetWithEndUserAccount200Response();
      SendEvmAssetWithEndUserAccountRequest request = new SendEvmAssetWithEndUserAccountRequest();
      when(embeddedWalletsApi.sendEvmAssetWithEndUserAccount(
              eq(USER_ID),
              eq(EVM_ADDRESS),
              eq(ASSET),
              eq(WALLET_JWT),
              eq(IDEMPOTENCY_KEY),
              isNull(),
              isNull(),
              eq(request)))
          .thenReturn(expected);

      SendEvmAssetWithEndUserAccount200Response result =
          client.sendEvmAsset(USER_ID, EVM_ADDRESS, ASSET, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class SendUserOperationTest {
    @Test
    void sendsUserOperation() throws ApiException {
      EvmUserOperation expected = new EvmUserOperation();
      SendUserOperationWithEndUserAccountRequest request =
          new SendUserOperationWithEndUserAccountRequest();
      when(embeddedWalletsApi.sendUserOperationWithEndUserAccount(
              eq(USER_ID),
              eq(EVM_ADDRESS),
              isNull(),
              eq(WALLET_JWT),
              isNull(),
              isNull(),
              eq(request)))
          .thenReturn(expected);

      EvmUserOperation result = client.sendUserOperation(USER_ID, EVM_ADDRESS, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void sendsUserOperationWithIdempotencyKey() throws ApiException {
      EvmUserOperation expected = new EvmUserOperation();
      SendUserOperationWithEndUserAccountRequest request =
          new SendUserOperationWithEndUserAccountRequest();
      when(embeddedWalletsApi.sendUserOperationWithEndUserAccount(
              eq(USER_ID),
              eq(EVM_ADDRESS),
              eq(IDEMPOTENCY_KEY),
              eq(WALLET_JWT),
              isNull(),
              isNull(),
              eq(request)))
          .thenReturn(expected);

      EvmUserOperation result =
          client.sendUserOperation(USER_ID, EVM_ADDRESS, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class CreateEvmEip7702DelegationTest {
    @Test
    void createsEip7702Delegation() throws ApiException {
      CreateEvmEip7702DelegationWithEndUserAccount201Response expected =
          new CreateEvmEip7702DelegationWithEndUserAccount201Response();
      CreateEvmEip7702DelegationWithEndUserAccountRequest request =
          new CreateEvmEip7702DelegationWithEndUserAccountRequest();
      when(embeddedWalletsApi.createEvmEip7702DelegationWithEndUserAccount(
              eq(USER_ID), eq(request), eq(WALLET_JWT), isNull(), isNull(), isNull()))
          .thenReturn(expected);

      CreateEvmEip7702DelegationWithEndUserAccount201Response result =
          client.createEvmEip7702Delegation(USER_ID, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void createsEip7702DelegationWithIdempotencyKey() throws ApiException {
      CreateEvmEip7702DelegationWithEndUserAccount201Response expected =
          new CreateEvmEip7702DelegationWithEndUserAccount201Response();
      CreateEvmEip7702DelegationWithEndUserAccountRequest request =
          new CreateEvmEip7702DelegationWithEndUserAccountRequest();
      when(embeddedWalletsApi.createEvmEip7702DelegationWithEndUserAccount(
              eq(USER_ID), eq(request), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), isNull(), isNull()))
          .thenReturn(expected);

      CreateEvmEip7702DelegationWithEndUserAccount201Response result =
          client.createEvmEip7702Delegation(USER_ID, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  // ==================== Delegated Solana Sign Methods ====================

  @Nested
  class SignSolanaMessageTest {
    @Test
    void signsSolanaMessage() throws ApiException {
      SignSolanaMessageWithEndUserAccount200Response expected =
          new SignSolanaMessageWithEndUserAccount200Response();
      SignSolanaMessageWithEndUserAccountRequest request =
          new SignSolanaMessageWithEndUserAccountRequest();
      when(embeddedWalletsApi.signSolanaMessageWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), isNull(), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SignSolanaMessageWithEndUserAccount200Response result =
          client.signSolanaMessage(USER_ID, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void signsSolanaMessageWithIdempotencyKey() throws ApiException {
      SignSolanaMessageWithEndUserAccount200Response expected =
          new SignSolanaMessageWithEndUserAccount200Response();
      SignSolanaMessageWithEndUserAccountRequest request =
          new SignSolanaMessageWithEndUserAccountRequest();
      when(embeddedWalletsApi.signSolanaMessageWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SignSolanaMessageWithEndUserAccount200Response result =
          client.signSolanaMessage(USER_ID, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class SignSolanaTransactionTest {
    @Test
    void signsSolanaTransaction() throws ApiException {
      SignSolanaTransactionWithEndUserAccount200Response expected =
          new SignSolanaTransactionWithEndUserAccount200Response();
      SignSolanaTransactionWithEndUserAccountRequest request =
          new SignSolanaTransactionWithEndUserAccountRequest();
      when(embeddedWalletsApi.signSolanaTransactionWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), isNull(), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SignSolanaTransactionWithEndUserAccount200Response result =
          client.signSolanaTransaction(USER_ID, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void signsSolanaTransactionWithIdempotencyKey() throws ApiException {
      SignSolanaTransactionWithEndUserAccount200Response expected =
          new SignSolanaTransactionWithEndUserAccount200Response();
      SignSolanaTransactionWithEndUserAccountRequest request =
          new SignSolanaTransactionWithEndUserAccountRequest();
      when(embeddedWalletsApi.signSolanaTransactionWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SignSolanaTransactionWithEndUserAccount200Response result =
          client.signSolanaTransaction(USER_ID, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  // ==================== Delegated Solana Send Methods ====================

  @Nested
  class SendSolanaTransactionTest {
    @Test
    void sendsSolanaTransaction() throws ApiException {
      SendSolanaTransactionWithEndUserAccount200Response expected =
          new SendSolanaTransactionWithEndUserAccount200Response();
      SendSolanaTransactionWithEndUserAccountRequest request =
          new SendSolanaTransactionWithEndUserAccountRequest();
      when(embeddedWalletsApi.sendSolanaTransactionWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), isNull(), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SendSolanaTransactionWithEndUserAccount200Response result =
          client.sendSolanaTransaction(USER_ID, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void sendsSolanaTransactionWithIdempotencyKey() throws ApiException {
      SendSolanaTransactionWithEndUserAccount200Response expected =
          new SendSolanaTransactionWithEndUserAccount200Response();
      SendSolanaTransactionWithEndUserAccountRequest request =
          new SendSolanaTransactionWithEndUserAccountRequest();
      when(embeddedWalletsApi.sendSolanaTransactionWithEndUserAccount(
              eq(USER_ID), eq(WALLET_JWT), eq(IDEMPOTENCY_KEY), isNull(), isNull(), eq(request)))
          .thenReturn(expected);

      SendSolanaTransactionWithEndUserAccount200Response result =
          client.sendSolanaTransaction(USER_ID, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  @Nested
  class SendSolanaAssetTest {
    @Test
    void sendsSolanaAsset() throws ApiException {
      SendSolanaTransactionWithEndUserAccount200Response expected =
          new SendSolanaTransactionWithEndUserAccount200Response();
      SendSolanaAssetWithEndUserAccountRequest request =
          new SendSolanaAssetWithEndUserAccountRequest();
      when(embeddedWalletsApi.sendSolanaAssetWithEndUserAccount(
              eq(USER_ID),
              eq(SOLANA_ADDRESS),
              eq(ASSET),
              eq(WALLET_JWT),
              isNull(),
              isNull(),
              isNull(),
              eq(request)))
          .thenReturn(expected);

      SendSolanaTransactionWithEndUserAccount200Response result =
          client.sendSolanaAsset(USER_ID, SOLANA_ADDRESS, ASSET, request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void sendsSolanaAssetWithIdempotencyKey() throws ApiException {
      SendSolanaTransactionWithEndUserAccount200Response expected =
          new SendSolanaTransactionWithEndUserAccount200Response();
      SendSolanaAssetWithEndUserAccountRequest request =
          new SendSolanaAssetWithEndUserAccountRequest();
      when(embeddedWalletsApi.sendSolanaAssetWithEndUserAccount(
              eq(USER_ID),
              eq(SOLANA_ADDRESS),
              eq(ASSET),
              eq(WALLET_JWT),
              eq(IDEMPOTENCY_KEY),
              isNull(),
              isNull(),
              eq(request)))
          .thenReturn(expected);

      SendSolanaTransactionWithEndUserAccount200Response result =
          client.sendSolanaAsset(USER_ID, SOLANA_ADDRESS, ASSET, request, IDEMPOTENCY_KEY);

      assertThat(result).isEqualTo(expected);
    }
  }

  // ==================== TokenProvider Pattern ====================

  @Nested
  class TokenProviderPattern {
    private EndUserClient tokenProviderClient;

    @BeforeEach
    void setUp() {
      TokenProvider tokenProvider = mock(TokenProvider.class);
      when(tokenProvider.walletAuthToken()).thenReturn(Optional.of(WALLET_JWT));

      ApiClient apiClient = mock(ApiClient.class);
      tokenProviderClient = new EndUserClient(apiClient, tokenProvider);

      // Inject mock APIs
      try {
        var endUserAccountsField = EndUserClient.class.getDeclaredField("endUserAccountsApi");
        endUserAccountsField.setAccessible(true);
        endUserAccountsField.set(tokenProviderClient, endUserAccountsApi);

        var embeddedWalletsField = EndUserClient.class.getDeclaredField("embeddedWalletsApi");
        embeddedWalletsField.setAccessible(true);
        embeddedWalletsField.set(tokenProviderClient, embeddedWalletsApi);
      } catch (Exception e) {
        throw new RuntimeException("Failed to inject mock APIs", e);
      }
    }

    @Test
    void usesTokenProviderWalletJwt() throws ApiException {
      EndUser expected = new EndUser().userId(USER_ID);
      CreateEndUserRequest request = new CreateEndUserRequest().userId(USER_ID);
      when(endUserAccountsApi.createEndUser(eq(WALLET_JWT), isNull(), any())).thenReturn(expected);

      EndUser result = tokenProviderClient.createEndUser(request);

      assertThat(result).isEqualTo(expected);
    }

    @Test
    void handlesEmptyWalletAuthToken() throws ApiException {
      TokenProvider noWalletProvider = mock(TokenProvider.class);
      when(noWalletProvider.walletAuthToken()).thenReturn(Optional.empty());

      ApiClient apiClient = mock(ApiClient.class);
      EndUserClient noWalletClient = new EndUserClient(apiClient, noWalletProvider);

      try {
        var endUserAccountsField = EndUserClient.class.getDeclaredField("endUserAccountsApi");
        endUserAccountsField.setAccessible(true);
        endUserAccountsField.set(noWalletClient, endUserAccountsApi);
      } catch (Exception e) {
        throw new RuntimeException(e);
      }

      EndUser expected = new EndUser().userId(USER_ID);
      CreateEndUserRequest request = new CreateEndUserRequest().userId(USER_ID);
      when(endUserAccountsApi.createEndUser(isNull(), isNull(), any())).thenReturn(expected);

      EndUser result = noWalletClient.createEndUser(request);

      assertThat(result).isEqualTo(expected);
    }
  }

  // ==================== ListEndUsersOptions ====================

  @Nested
  class ListEndUsersOptionsTest {
    @Test
    void buildsWithDefaults() {
      ListEndUsersOptions options = ListEndUsersOptions.builder().build();

      assertThat(options.pageSize()).isNull();
      assertThat(options.pageToken()).isNull();
      assertThat(options.sort()).isNull();
    }

    @Test
    void buildsWithAllFields() {
      List<String> sort = List.of("desc");
      ListEndUsersOptions options =
          ListEndUsersOptions.builder().pageSize(25).pageToken("next").sort(sort).build();

      assertThat(options.pageSize()).isEqualTo(25);
      assertThat(options.pageToken()).isEqualTo("next");
      assertThat(options.sort()).isEqualTo(sort);
    }
  }
}
