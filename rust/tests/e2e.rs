use alloy::consensus::SignableTransaction;
use alloy::primitives::{address, hex};
use alloy::{network::TransactionBuilder, primitives::U256, rpc::types::TransactionRequest};
use base64::Engine;
use cdp_sdk::{auth::WalletAuth, types, Client, CDP_BASE_URL};
use rand::Rng;
use reqwest_middleware::ClientBuilder;
use std::env;

/// Helper struct for logging
struct Logger {
    enabled: bool,
}

impl Logger {
    fn new() -> Self {
        Self {
            enabled: env::var("E2E_LOGGING").unwrap_or_default() == "true",
        }
    }

    fn log(&self, msg: &str) {
        if self.enabled {
            println!("{}", msg);
        }
    }

    fn _warn(&self, msg: &str) {
        if self.enabled {
            eprintln!("WARN: {}", msg);
        }
    }

    fn _error(&self, msg: &str) {
        if self.enabled {
            eprintln!("ERROR: {}", msg);
        }
    }
}

/// Helper function to generate random account names
fn generate_random_name() -> String {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let chars_with_hyphen = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
    let min_length = 5;

    let mut rng = rand::rng();

    let first_char = chars.chars().nth(rng.random_range(0..chars.len())).unwrap();

    let middle_length = std::cmp::max(rng.random_range(0..34), min_length);
    let middle_part: String = (0..middle_length)
        .map(|_| {
            chars_with_hyphen
                .chars()
                .nth(rng.random_range(0..chars_with_hyphen.len()))
                .unwrap()
        })
        .collect();

    let last_char = chars.chars().nth(rng.random_range(0..chars.len())).unwrap();

    format!("{}{}{}", first_char, middle_part, last_char)
}

/// Create test client with authentication
fn create_test_client() -> Result<Client, Box<dyn std::error::Error>> {
    let base_path = env::var("E2E_BASE_PATH").unwrap_or_else(|_| CDP_BASE_URL.to_string());

    let wallet_auth = WalletAuth::builder().debug(true).build()?;

    let http_client = ClientBuilder::new(reqwest::Client::new())
        .with(wallet_auth)
        .build();

    let client = Client::new_with_client(&base_path, http_client);

    Ok(client)
}

#[tokio::test]
async fn test_evm_account_crud_operations() -> Result<(), Box<dyn std::error::Error>> {
    let logger = Logger::new();
    let client = create_test_client()?;

    logger.log("Testing EVM account CRUD operations");

    // Test create account
    let random_name = generate_random_name();
    logger.log(&format!("Creating account with name: {}", random_name));

    let body = types::CreateEvmAccountBody::builder().name(Some(random_name.clone().parse()?));

    let response = client
        .create_evm_account()
        .x_wallet_auth("") // Added by WalletAuth middleware
        .body(body)
        .send()
        .await?;

    // Verify the response is successful
    assert!(response.status().is_success());
    let account = response.into_inner();

    // Verify the name and address
    assert_eq!(
        account.name.as_ref().map(|n| n.as_str()),
        Some(random_name.as_str())
    );
    assert!(!account.address.is_empty());
    assert!(account.address.starts_with("0x"));

    logger.log(&format!(
        "Successfully created EVM account with name: {:?} and address: {:?}",
        account.name, account.address
    ));

    let account_address = account.address.clone();
    let account_name = account.name.clone();

    // Test get_evm_account by address
    logger.log("Testing get_evm_account by address");
    let get_response = client
        .get_evm_account()
        .address(account_address.to_string())
        .send()
        .await?;

    assert!(get_response.status().is_success());
    let retrieved_account = get_response.into_inner();

    assert_eq!(retrieved_account.address, account_address);
    assert_eq!(retrieved_account.name, account_name);
    logger.log("Successfully retrieved account by address");

    // Test get_evm_account_by_name
    logger.log("Testing get_evm_account_by_name");
    let get_by_name_response = client
        .get_evm_account_by_name()
        .name(&random_name)
        .send()
        .await?;

    assert!(get_by_name_response.status().is_success());
    let retrieved_by_name_account = get_by_name_response.into_inner();

    assert_eq!(retrieved_by_name_account.address, account_address);
    assert_eq!(retrieved_by_name_account.name, account_name);
    logger.log("Successfully retrieved account by name");

    // Test list_evm_accounts
    logger.log("Testing list_evm_accounts");
    let list_response = client.list_evm_accounts().page_size(10).send().await?;

    assert!(list_response.status().is_success());
    let accounts_list = list_response.into_inner();

    // Verify our account is in the list
    logger.log(&format!(
        "Successfully listed accounts, found {} accounts",
        accounts_list.accounts.len()
    ));
    assert!(
        !accounts_list.accounts.is_empty(),
        "Accounts list should not be empty"
    );

    // Test update_evm_account
    logger.log("Testing update_evm_account");
    let updated_name = generate_random_name();

    let update_body =
        types::UpdateEvmAccountBody::builder().name(Some(updated_name.clone().parse()?));

    let update_response = client
        .update_evm_account()
        .address(account_address.to_string())
        .body(update_body)
        .send()
        .await?;

    assert!(update_response.status().is_success());
    let updated_account = update_response.into_inner();

    assert_eq!(updated_account.address, account_address);
    assert_eq!(
        updated_account.name.as_ref().map(|n| n.as_str()),
        Some(updated_name.as_str())
    );
    logger.log(&format!(
        "Successfully updated account name to: {}",
        updated_name
    ));

    // Verify the update by getting the account again
    logger.log("Verifying account update");
    let verify_response = client
        .get_evm_account()
        .address(account_address.to_string())
        .send()
        .await?;

    assert!(verify_response.status().is_success());
    let verified_account = verify_response.into_inner();

    assert_eq!(verified_account.address, account_address);
    assert_eq!(
        verified_account.name.as_ref().map(|n| n.as_str()),
        Some(updated_name.as_str())
    );
    logger.log("Successfully verified account update");

    logger.log("All EVM account CRUD operations completed successfully!");
    Ok(())
}

#[tokio::test]
async fn test_evm_signing_operations() -> Result<(), Box<dyn std::error::Error>> {
    let logger = Logger::new();
    let client = create_test_client()?;

    logger.log("Testing EVM account CRUD operations");

    let response = client
        .get_evm_account_by_name()
        .name("E2EServerAccount2")
        .send()
        .await?;

    // Verify the response is successful
    assert!(response.status().is_success());
    let account = response.into_inner();

    let tx = TransactionRequest::default()
        .with_to(address!("f39Fd6e51aad88F6F4ce6aB8827279cffFb92266"))
        .with_nonce(124)
        .with_chain_id(84532)
        .with_value(U256::from(100))
        .with_gas_limit(21_000)
        .with_max_fee_per_gas(20_000_000_000) // 20 gwei in wei
        .with_max_priority_fee_per_gas(1_000_000_000) // 1 gwei tip in wei
        .build_typed_tx()
        .map_err(|_e| "Failed to build transaction".to_string())?;

    let mut buffer = Vec::new();
    tx.encode_for_signing(&mut buffer);
    let hex_encoded = hex::encode(&buffer);

    let body = types::SignEvmTransactionBody::builder().transaction(format!("0x{}", hex_encoded));

    let sign_response = client
        .sign_evm_transaction()
        .address(account.address.to_string())
        .x_wallet_auth("".to_string())
        .body(body)
        .send()
        .await?;

    assert!(sign_response.status().is_success());
    logger.log("Successfully signed transaction");

    Ok(())
}

#[tokio::test]
async fn test_evm_sign_functions() -> Result<(), Box<dyn std::error::Error>> {
    let logger = Logger::new();
    let client = create_test_client()?;

    logger.log("Testing EVM sign functions");

    // Create a test account
    let random_name = generate_random_name();
    let body = types::CreateEvmAccountBody::builder().name(Some(random_name.parse()?));

    let response = client
        .create_evm_account()
        .x_wallet_auth("")
        .body(body)
        .send()
        .await?;

    let account = response.into_inner();
    logger.log(&format!("Created test account: {:?}", account.address));

    // Test sign hash
    logger.log("Testing sign hash");
    let hash_body = types::SignEvmHashBody::builder().hash(format!("0x{}", "1".repeat(64)));

    let hash_response = client
        .sign_evm_hash()
        .address(account.address.to_string())
        .x_wallet_auth("")
        .body(hash_body)
        .send()
        .await?;

    assert!(hash_response.status().is_success());
    let hash_result = hash_response.into_inner();
    assert!(!hash_result.signature.is_empty());
    logger.log("Successfully signed hash");

    // Test sign message
    logger.log("Testing sign message");
    let message_body = types::SignEvmMessageBody::builder().message("0x123".to_string());

    let message_response = client
        .sign_evm_message()
        .address(account.address.to_string())
        .x_wallet_auth("")
        .body(message_body)
        .send()
        .await?;

    assert!(message_response.status().is_success());
    let message_result = message_response.into_inner();
    assert!(!message_result.signature.is_empty());
    logger.log("Successfully signed message");

    // Test sign transaction (already covered in test_evm_signing_operations)
    logger.log("Testing sign transaction");
    let tx = TransactionRequest::default()
        .with_to(address!("0000000000000000000000000000000000000000"))
        .with_nonce(0)
        .with_chain_id(84532)
        .with_value(U256::from(10000000000000000u64)) // 0.01 ETH
        .with_gas_limit(21_000)
        .with_max_fee_per_gas(20_000_000_000) // 20 gwei
        .with_max_priority_fee_per_gas(1_000_000_000) // 1 gwei
        .build_typed_tx()
        .map_err(|_e| "Failed to build transaction")?;

    let mut buffer = Vec::new();
    tx.encode_for_signing(&mut buffer);
    let hex_encoded = hex::encode(&buffer);

    let sign_body =
        types::SignEvmTransactionBody::builder().transaction(format!("0x{}", hex_encoded));

    let sign_response = client
        .sign_evm_transaction()
        .address(account.address.to_string())
        .x_wallet_auth("")
        .body(sign_body)
        .send()
        .await?;

    assert!(sign_response.status().is_success());
    let sign_result = sign_response.into_inner();
    assert!(!sign_result.signed_transaction.is_empty());
    logger.log("Successfully signed transaction");

    logger.log("All EVM sign functions completed successfully!");
    Ok(())
}

#[tokio::test]
async fn test_smart_account_operations() -> Result<(), Box<dyn std::error::Error>> {
    let logger = Logger::new();
    let client = create_test_client()?;

    logger.log("Testing smart account operations");

    // Create owner account first
    let owner_name = generate_random_name();
    let owner_body = types::CreateEvmAccountBody::builder().name(Some(owner_name.parse()?));

    let owner_response = client
        .create_evm_account()
        .x_wallet_auth("")
        .body(owner_body)
        .send()
        .await?;

    let owner_account = owner_response.into_inner();
    logger.log(&format!(
        "Created owner account: {:?}",
        owner_account.address
    ));

    // Test create smart account
    logger.log("Testing create smart account");
    let smart_account_name = generate_random_name();
    let smart_body = types::CreateEvmSmartAccountBody::builder()
        .name(Some(smart_account_name.clone().parse()?))
        .owners(vec![owner_account.address.to_string().parse()?]);

    let smart_response = client
        .create_evm_smart_account()
        .body(smart_body)
        .send()
        .await?;

    assert!(smart_response.status().is_success());
    let smart_account = smart_response.into_inner();
    assert!(!smart_account.address.is_empty());
    assert!(smart_account.address.starts_with("0x"));
    logger.log(&format!(
        "Created smart account: {:?}",
        smart_account.address
    ));

    // Test list smart accounts
    logger.log("Testing list smart accounts");
    let list_response = client
        .list_evm_smart_accounts()
        .page_size(10)
        .send()
        .await?;

    assert!(list_response.status().is_success());
    let smart_accounts_list = list_response.into_inner();
    assert!(!smart_accounts_list.accounts.is_empty());
    logger.log(&format!(
        "Found {} smart accounts",
        smart_accounts_list.accounts.len()
    ));

    // Test get smart account by address
    logger.log("Testing get smart account by address");
    let get_smart_response = client
        .get_evm_smart_account()
        .address(smart_account.address.to_string())
        .send()
        .await?;

    assert!(get_smart_response.status().is_success());
    let retrieved_smart_account = get_smart_response.into_inner();
    assert_eq!(retrieved_smart_account.address, smart_account.address);
    logger.log("Successfully retrieved smart account by address");

    // Test update smart account
    logger.log("Testing update smart account");
    let updated_name = generate_random_name();
    let update_smart_body =
        types::UpdateEvmSmartAccountBody::builder().name(Some(updated_name.clone().parse()?));

    let update_smart_response = client
        .update_evm_smart_account()
        .address(smart_account.address.to_string())
        .body(update_smart_body)
        .send()
        .await?;

    assert!(update_smart_response.status().is_success());
    let updated_smart_account = update_smart_response.into_inner();
    assert_eq!(updated_smart_account.address, smart_account.address);
    assert_eq!(
        updated_smart_account.name.as_ref().map(|n| n.as_str()),
        Some(updated_name.as_str())
    );
    logger.log(&format!(
        "Successfully updated smart account name to: {}",
        updated_name
    ));

    logger.log("All smart account operations completed successfully!");
    Ok(())
}

#[tokio::test]
async fn test_solana_account_operations() -> Result<(), Box<dyn std::error::Error>> {
    let logger = Logger::new();
    let client = create_test_client()?;

    logger.log("Testing Solana account operations");

    // Test create Solana account
    let random_name = generate_random_name();
    let body = types::CreateSolanaAccountBody::builder().name(Some(random_name.clone().parse()?));

    let response = client
        .create_solana_account()
        .x_wallet_auth("")
        .body(body)
        .send()
        .await?;

    assert!(response.status().is_success());
    let account = response.into_inner();
    assert!(!account.address.is_empty());
    assert_eq!(
        account.name.as_ref().map(|n| n.as_str()),
        Some(random_name.as_str())
    );
    logger.log(&format!("Created Solana account: {:?}", account.address));

    let account_address = account.address.clone();
    let account_name = account.name.clone();

    // Test get Solana account by address
    logger.log("Testing get Solana account by address");
    let get_response = client
        .get_solana_account()
        .address(account_address.to_string())
        .send()
        .await?;

    assert!(get_response.status().is_success());
    let retrieved_account = get_response.into_inner();
    assert_eq!(retrieved_account.address, account_address);
    assert_eq!(retrieved_account.name, account_name);
    logger.log("Successfully retrieved Solana account by address");

    // Test get Solana account by name
    logger.log("Testing get Solana account by name");
    let get_by_name_response = client
        .get_solana_account_by_name()
        .name(&random_name)
        .send()
        .await?;

    assert!(get_by_name_response.status().is_success());
    let retrieved_by_name_account = get_by_name_response.into_inner();
    assert_eq!(retrieved_by_name_account.address, account_address);
    assert_eq!(retrieved_by_name_account.name, account_name);
    logger.log("Successfully retrieved Solana account by name");

    // Test list Solana accounts
    logger.log("Testing list Solana accounts");
    let list_response = client.list_solana_accounts().page_size(10).send().await?;

    assert!(list_response.status().is_success());
    let accounts_list = list_response.into_inner();
    assert!(!accounts_list.accounts.is_empty());
    logger.log(&format!(
        "Found {} Solana accounts",
        accounts_list.accounts.len()
    ));

    // Test update Solana account
    logger.log("Testing update Solana account");
    let updated_name = generate_random_name();
    let update_body =
        types::UpdateSolanaAccountBody::builder().name(Some(updated_name.clone().parse()?));

    let update_response = client
        .update_solana_account()
        .address(account_address.to_string())
        .body(update_body)
        .send()
        .await?;

    assert!(update_response.status().is_success());
    let updated_account = update_response.into_inner();
    assert_eq!(updated_account.address, account_address);
    assert_eq!(
        updated_account.name.as_ref().map(|n| n.as_str()),
        Some(updated_name.as_str())
    );
    logger.log(&format!(
        "Successfully updated Solana account name to: {}",
        updated_name
    ));

    logger.log("All Solana account operations completed successfully!");
    Ok(())
}

#[tokio::test]
async fn test_solana_sign_functions() -> Result<(), Box<dyn std::error::Error>> {
    let logger = Logger::new();
    let client = create_test_client()?;

    logger.log("Testing Solana sign functions");

    // Create a test account
    let random_name = generate_random_name();
    let body = types::CreateSolanaAccountBody::builder().name(Some(random_name.parse()?));

    let response = client
        .create_solana_account()
        .x_wallet_auth("")
        .body(body)
        .send()
        .await?;

    let account = response.into_inner();
    logger.log(&format!(
        "Created test Solana account: {:?}",
        account.address
    ));

    // Test sign message
    logger.log("Testing Solana sign message");
    let message = "Hello Solana!";
    let encoded_message = base64::engine::general_purpose::STANDARD.encode(message.as_bytes());

    let message_body = types::SignSolanaMessageBody::builder().message(encoded_message);

    let message_response = client
        .sign_solana_message()
        .address(account.address.to_string())
        .x_wallet_auth("")
        .body(message_body)
        .send()
        .await?;

    assert!(message_response.status().is_success());
    let message_result = message_response.into_inner();
    assert!(!message_result.signature.is_empty());
    logger.log("Successfully signed Solana message");

    // Test sign transaction
    logger.log("Testing Solana sign transaction");

    // Create a minimal valid transaction structure for the API
    let unsigned_tx_bytes = vec![
        0, // Number of signatures (0 for unsigned)
        1, // Number of required signatures
        0, // Number of read-only signed accounts
        0, // Number of read-only unsigned accounts
        1, // Number of account keys
    ];

    // Add the actual account's public key (32 bytes)
    let mut tx_bytes = unsigned_tx_bytes;
    let account_pubkey = bs58::decode(&*account.address)
        .into_vec()
        .map_err(|e| format!("Failed to decode Solana address: {}", e))?;
    if account_pubkey.len() != 32 {
        return Err(format!("Invalid Solana public key length: {}", account_pubkey.len()).into());
    }
    tx_bytes.extend_from_slice(&account_pubkey);
    tx_bytes.extend_from_slice(&[1u8; 32]); // Recent blockhash (32 bytes)
    tx_bytes.extend_from_slice(&[
        1, // Number of instructions
        0, // Program ID index
        1, // Number of accounts in instruction
        0, // Account index
        4, // Data length
        1, 2, 3, 4, // Instruction data
    ]);

    let base64_tx = base64::engine::general_purpose::STANDARD.encode(&tx_bytes);

    let tx_body = types::SignSolanaTransactionBody::builder().transaction(base64_tx);

    let tx_response = client
        .sign_solana_transaction()
        .address(account.address.to_string())
        .x_wallet_auth("")
        .body(tx_body)
        .send()
        .await?;

    assert!(tx_response.status().is_success());
    let tx_result = tx_response.into_inner();
    assert!(!tx_result.signed_transaction.is_empty());
    logger.log("Successfully signed Solana transaction");

    logger.log("All Solana sign functions completed successfully!");
    Ok(())
}

#[tokio::test]
async fn test_evm_token_balances() -> Result<(), Box<dyn std::error::Error>> {
    let logger = Logger::new();
    let client = create_test_client()?;

    if env::var("CDP_E2E_SKIP_EVM_TOKEN_BALANCES").unwrap_or_default() == "true" {
        logger.log("Skipping EVM token balances test as per environment variable");
        return Ok(());
    }

    logger.log("Testing EVM token balances");

    // Use a known address with token balances
    let test_address = "0x5b76f5B8fc9D700624F78208132f91AD4e61a1f0";

    // Test first page
    let first_page_response = client
        .list_evm_token_balances()
        .address(test_address)
        .network("base-sepolia")
        .page_size(1)
        .send()
        .await?;

    assert!(first_page_response.status().is_success());
    let first_page = first_page_response.into_inner();
    assert_eq!(first_page.balances.len(), 1);

    let first_balance = &first_page.balances[0];
    let token = &first_balance.token;
    assert!(!token.contract_address.is_empty());
    // Network check - just verify it exists
    assert!(!first_balance.amount.amount.is_empty());
    logger.log("Successfully retrieved first page of EVM token balances");

    // Test second page if there's a next page token
    if let Some(ref next_token) = first_page.next_page_token {
        let second_page_response = client
            .list_evm_token_balances()
            .address(test_address)
            .network("base-sepolia")
            .page_size(1)
            .page_token(next_token)
            .send()
            .await?;

        assert!(second_page_response.status().is_success());
        let second_page = second_page_response.into_inner();
        assert_eq!(second_page.balances.len(), 1);

        let second_balance = &second_page.balances[0];
        let token = &second_balance.token;
        assert!(!token.contract_address.is_empty());
        // Network check - just verify it exists
        assert!(!second_balance.amount.amount.is_empty());
        logger.log("Successfully retrieved second page of EVM token balances");
    }

    logger.log("EVM token balances test completed successfully!");
    Ok(())
}

#[tokio::test]
async fn test_solana_token_balances() -> Result<(), Box<dyn std::error::Error>> {
    let logger = Logger::new();
    let client = create_test_client()?;

    logger.log("Testing Solana token balances");

    // Use a known address with token balances
    let test_address = "4PkiqJkUvxr9P8C1UsMqGN8NJsUcep9GahDRLfmeu8UK";

    // Test first page
    let first_page_response = client
        .list_solana_token_balances()
        .address(test_address)
        .network("solana-devnet")
        .page_size(1)
        .send()
        .await?;

    assert!(first_page_response.status().is_success());
    let first_page = first_page_response.into_inner();
    assert_eq!(first_page.balances.len(), 1);

    let first_balance = &first_page.balances[0];
    let token = &first_balance.token;
    assert!(!token.mint_address.is_empty());
    assert!(token.name.is_some());
    assert!(token.symbol.is_some());
    assert!(!first_balance.amount.amount.is_empty());
    logger.log("Successfully retrieved first page of Solana token balances");

    // Test second page if there's a next page token
    if let Some(ref next_token) = first_page.next_page_token {
        let second_page_response = client
            .list_solana_token_balances()
            .address(test_address)
            .network("solana-devnet")
            .page_size(1)
            .page_token(next_token)
            .send()
            .await?;

        assert!(second_page_response.status().is_success());
        let second_page = second_page_response.into_inner();
        assert_eq!(second_page.balances.len(), 1);

        let second_balance = &second_page.balances[0];
        let token = &second_balance.token;
        assert!(!token.mint_address.is_empty());
        assert!(!second_balance.amount.amount.is_empty());
        logger.log("Successfully retrieved second page of Solana token balances");
    }

    logger.log("Solana token balances test completed successfully!");
    Ok(())
}
