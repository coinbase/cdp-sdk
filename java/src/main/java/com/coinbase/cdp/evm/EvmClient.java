package com.coinbase.cdp.evm;

import com.coinbase.cdp.evm.options.CreateAccountOptions;
import com.coinbase.cdp.evm.options.CreateSmartAccountOptions;
import com.coinbase.cdp.evm.options.GetAccountOptions;
import com.coinbase.cdp.evm.options.GetOrCreateAccountOptions;
import com.coinbase.cdp.evm.options.GetOrCreateSmartAccountOptions;
import com.coinbase.cdp.evm.options.GetSmartAccountOptions;
import com.coinbase.cdp.evm.options.ListAccountsOptions;
import com.coinbase.cdp.evm.options.ListSmartAccountsOptions;
import com.coinbase.cdp.evm.options.RequestFaucetOptions;
import com.coinbase.cdp.evm.options.SignMessageOptions;
import com.coinbase.cdp.openapi.ApiException;
import com.coinbase.cdp.openapi.api.EvmAccountsApi;
import com.coinbase.cdp.openapi.api.EvmSmartAccountsApi;
import com.coinbase.cdp.openapi.api.FaucetsApi;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.CreateEvmSmartAccountRequest;
import com.coinbase.cdp.openapi.model.EvmAccount;
import com.coinbase.cdp.openapi.model.EvmSmartAccount;
import com.coinbase.cdp.openapi.model.ListEvmAccounts200Response;
import com.coinbase.cdp.openapi.model.ListEvmSmartAccounts200Response;
import com.coinbase.cdp.openapi.model.RequestEvmFaucet200Response;
import com.coinbase.cdp.openapi.model.RequestEvmFaucetRequest;
import com.coinbase.cdp.openapi.model.SignEvmMessage200Response;
import com.coinbase.cdp.openapi.model.SignEvmMessageRequest;
import java.util.List;
import java.util.function.BiFunction;

/**
 * High-level client for EVM account operations.
 *
 * <p>This class provides convenient methods for managing EVM accounts and smart accounts, including
 * higher-level abstractions like {@link #getOrCreateAccount} that handle common patterns.
 *
 * <p>Example usage:
 *
 * <pre>{@code
 * try (CdpClient cdp = CdpClient.create()) {
 *     // Get or create an account by name
 *     EvmAccount account = cdp.evm().getOrCreateAccount(
 *         GetOrCreateAccountOptions.builder()
 *             .name("MyAccount")
 *             .build()
 *     );
 *
 *     System.out.println("Account address: " + account.getAddress());
 * }
 * }</pre>
 */
public class EvmClient {

  private final EvmAccountsApi evmAccountsApi;
  private final EvmSmartAccountsApi evmSmartAccountsApi;
  private final FaucetsApi faucetsApi;
  private final BiFunction<String, Object, String> walletJwtGenerator;

  /**
   * Creates a new EvmClient.
   *
   * @param evmAccountsApi the EVM accounts API client
   * @param evmSmartAccountsApi the EVM smart accounts API client
   * @param faucetsApi the faucets API client
   * @param walletJwtGenerator function to generate wallet JWTs for write operations
   */
  public EvmClient(
      EvmAccountsApi evmAccountsApi,
      EvmSmartAccountsApi evmSmartAccountsApi,
      FaucetsApi faucetsApi,
      BiFunction<String, Object, String> walletJwtGenerator) {
    this.evmAccountsApi = evmAccountsApi;
    this.evmSmartAccountsApi = evmSmartAccountsApi;
    this.faucetsApi = faucetsApi;
    this.walletJwtGenerator = walletJwtGenerator;
  }

  /**
   * Creates a new EVM account.
   *
   * @param options options for creating the account
   * @return the created account
   * @throws ApiException if the API call fails
   */
  public EvmAccount createAccount(CreateAccountOptions options) throws ApiException {
    var request = new CreateEvmAccountRequest();
    options.name().ifPresent(request::name);
    options.accountPolicy().ifPresent(request::accountPolicy);

    String walletJwt = walletJwtGenerator.apply("/v2/evm/accounts", request);

    return evmAccountsApi.createEvmAccount(
        walletJwt, options.idempotencyKey().orElse(null), request);
  }

  /**
   * Creates a new EVM account with default options.
   *
   * @return the created account
   * @throws ApiException if the API call fails
   */
  public EvmAccount createAccount() throws ApiException {
    return createAccount(CreateAccountOptions.builder().build());
  }

  /**
   * Gets an EVM account by address or name.
   *
   * @param options options specifying how to find the account
   * @return the account
   * @throws ApiException if the API call fails or account is not found
   */
  public EvmAccount getAccount(GetAccountOptions options) throws ApiException {
    if (options.address().isPresent()) {
      return evmAccountsApi.getEvmAccount(options.address().get());
    }
    return evmAccountsApi.getEvmAccountByName(options.name().get());
  }

  /**
   * Gets an EVM account by name, or creates one if it doesn't exist.
   *
   * <p>This method handles the common pattern of ensuring an account exists with a given name. It
   * first attempts to retrieve an existing account, and if none exists, creates a new one.
   *
   * <p>This method also handles race conditions: if another request creates the account between
   * the get and create calls, this method will retrieve the existing account.
   *
   * @param options options containing the account name
   * @return the existing or newly created account
   * @throws ApiException if the API call fails
   */
  public EvmAccount getOrCreateAccount(GetOrCreateAccountOptions options) throws ApiException {
    try {
      return getAccountInternal(options.name());
    } catch (ApiException e) {
      if (e.getCode() == 404) {
        try {
          return createAccountInternal(options.name());
        } catch (ApiException createEx) {
          if (createEx.getCode() == 409) {
            // Race condition - account was created by another request
            return getAccountInternal(options.name());
          }
          throw createEx;
        }
      }
      throw e;
    }
  }

  /**
   * Lists EVM accounts.
   *
   * @param options options for pagination
   * @return the list response containing accounts and pagination token
   * @throws ApiException if the API call fails
   */
  public ListEvmAccounts200Response listAccounts(ListAccountsOptions options) throws ApiException {
    return evmAccountsApi.listEvmAccounts(
        options.pageSize().orElse(null), options.pageToken().orElse(null));
  }

  /**
   * Lists EVM accounts with default options.
   *
   * @return the list response containing accounts
   * @throws ApiException if the API call fails
   */
  public ListEvmAccounts200Response listAccounts() throws ApiException {
    return listAccounts(ListAccountsOptions.empty());
  }

  /**
   * Creates a new EVM smart account.
   *
   * @param options options for creating the smart account, including the owner address
   * @return the created smart account
   * @throws ApiException if the API call fails
   */
  public EvmSmartAccount createSmartAccount(CreateSmartAccountOptions options)
      throws ApiException {
    var request = new CreateEvmSmartAccountRequest();
    request.owners(List.of(options.ownerAddress()));
    options.name().ifPresent(request::name);

    return evmSmartAccountsApi.createEvmSmartAccount(
        options.idempotencyKey().orElse(null), request);
  }

  /**
   * Gets an EVM smart account by address or name.
   *
   * @param options options specifying how to find the smart account
   * @return the smart account
   * @throws ApiException if the API call fails or account is not found
   */
  public EvmSmartAccount getSmartAccount(GetSmartAccountOptions options) throws ApiException {
    if (options.address().isPresent()) {
      return evmSmartAccountsApi.getEvmSmartAccount(options.address().get());
    }
    return evmSmartAccountsApi.getEvmSmartAccountByName(options.name().get());
  }

  /**
   * Gets an EVM smart account by name, or creates one if it doesn't exist.
   *
   * <p>This method handles the common pattern of ensuring a smart account exists. It first
   * attempts to retrieve an existing smart account by name, and if none exists, creates a new one
   * with the specified owner.
   *
   * <p>This method also handles race conditions: if another request creates the account between
   * the get and create calls, this method will retrieve the existing account.
   *
   * @param options options containing the owner address and optional name
   * @return the existing or newly created smart account
   * @throws ApiException if the API call fails
   */
  public EvmSmartAccount getOrCreateSmartAccount(GetOrCreateSmartAccountOptions options)
      throws ApiException {
    if (options.name().isPresent()) {
      try {
        return getSmartAccountInternal(options.name().get());
      } catch (ApiException e) {
        if (e.getCode() == 404) {
          try {
            return createSmartAccountInternal(options.ownerAddress(), options.name().orElse(null));
          } catch (ApiException createEx) {
            if (createEx.getCode() == 409) {
              // Race condition - account was created by another request
              return getSmartAccountInternal(options.name().get());
            }
            throw createEx;
          }
        }
        throw e;
      }
    } else {
      // Without a name, we can only create a new smart account
      return createSmartAccountInternal(options.ownerAddress(), null);
    }
  }

  /**
   * Lists EVM smart accounts.
   *
   * @param options options for pagination
   * @return the list response containing smart accounts and pagination token
   * @throws ApiException if the API call fails
   */
  public ListEvmSmartAccounts200Response listSmartAccounts(ListSmartAccountsOptions options)
      throws ApiException {
    return evmSmartAccountsApi.listEvmSmartAccounts(
        options.pageSize().orElse(null), options.pageToken().orElse(null));
  }

  /**
   * Lists EVM smart accounts with default options.
   *
   * @return the list response containing smart accounts
   * @throws ApiException if the API call fails
   */
  public ListEvmSmartAccounts200Response listSmartAccounts() throws ApiException {
    return listSmartAccounts(ListSmartAccountsOptions.empty());
  }

  /**
   * Signs a message with an EVM account.
   *
   * <p>This method signs an arbitrary message using the specified account. This is useful for
   * authentication, proving ownership, and off-chain signatures.
   *
   * @param options options containing the address and message to sign
   * @return the signature response
   * @throws ApiException if the API call fails
   */
  public SignEvmMessage200Response signMessage(SignMessageOptions options) throws ApiException {
    var request = new SignEvmMessageRequest().message(options.message());
    String path = "/v2/evm/accounts/" + options.address() + "/sign/message";
    String walletJwt = walletJwtGenerator.apply(path, request);

    return evmAccountsApi.signEvmMessage(
        options.address(), walletJwt, options.idempotencyKey().orElse(null), request);
  }

  /**
   * Requests testnet funds from the faucet.
   *
   * <p>This method requests test tokens for development on testnets like Base Sepolia.
   *
   * @param options options containing the address, network, and token type
   * @return the faucet response with the transaction hash
   * @throws ApiException if the API call fails
   */
  public RequestEvmFaucet200Response requestFaucet(RequestFaucetOptions options)
      throws ApiException {
    var request =
        new RequestEvmFaucetRequest()
            .address(options.address())
            .network(RequestEvmFaucetRequest.NetworkEnum.fromValue(options.network()))
            .token(RequestEvmFaucetRequest.TokenEnum.fromValue(options.token()));

    return faucetsApi.requestEvmFaucet(request);
  }

  private EvmAccount getAccountInternal(String name) throws ApiException {
    return evmAccountsApi.getEvmAccountByName(name);
  }

  private EvmAccount createAccountInternal(String name) throws ApiException {
    var request = new CreateEvmAccountRequest().name(name);
    String walletJwt = walletJwtGenerator.apply("/v2/evm/accounts", request);
    return evmAccountsApi.createEvmAccount(walletJwt, null, request);
  }

  private EvmSmartAccount getSmartAccountInternal(String name) throws ApiException {
    return evmSmartAccountsApi.getEvmSmartAccountByName(name);
  }

  private EvmSmartAccount createSmartAccountInternal(String ownerAddress, String name)
      throws ApiException {
    var request = new CreateEvmSmartAccountRequest().owners(List.of(ownerAddress));
    if (name != null) {
      request.name(name);
    }
    return evmSmartAccountsApi.createEvmSmartAccount(null, request);
  }
}
