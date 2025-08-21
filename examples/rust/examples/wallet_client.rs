use cdp_sdk::{auth::WalletAuth, types, Client, Error, CDP_BASE_URL};
use dotenv::dotenv;
use reqwest_middleware::ClientBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    // Initialize the CDP client
    let wallet_auth = ClientBuilder::new(reqwest::Client::new())
        .with(WalletAuth::default())
        .build();
    let client = Client::new_with_client(CDP_BASE_URL, wallet_auth);

    // Example 1: List EVM accounts (public endpoint)
    println!("Listing EVM accounts...");
    let accounts_result = client.list_evm_accounts().send().await;

    match accounts_result {
        Ok(response) => {
            println!("Successfully retrieved accounts: {:?}", response);
        }
        Err(e) => {
            println!("Error listing accounts: {:?}", e);
        }
    }

    // Example 2: Create a new EVM account
    println!("\nCreating a new EVM account...");
    let body = types::CreateEvmAccountBody::builder().name(Some("my-test-account".parse()?));
    let create_result = client
        .create_evm_account()
        .x_wallet_auth("") // added by WalletAuth middleware
        .x_idempotency_key("unique-request-id-123")
        .body(body)
        .send()
        .await;

    match create_result {
        Ok(response) => {
            println!("Successfully created account: {:?}", response);
        }
        Err(e) => match e {
            Error::ErrorResponse(err_resp) => {
                println!(
                    "API Error Response: {} - {} {}",
                    err_resp.status(),
                    err_resp.error_type,
                    err_resp.error_message
                );
            }
            _ => {
                println!("Other error: {:?}", e);
            }
        },
    }

    // Example 3: Get account by name
    println!("\nGetting account by name...");
    let get_result = client
        .get_evm_account_by_name()
        .name("my-test-account")
        .send()
        .await;

    match get_result {
        Ok(response) => {
            println!("Successfully retrieved account: {:?}", response);
        }
        Err(e) => {
            println!("Error getting account: {:?}", e);
        }
    }

    // Example 4: List EVM smart accounts (public endpoint)
    println!("\nListing EVM smart accounts...");
    let smart_accounts_result = client.list_evm_smart_accounts().send().await;

    match smart_accounts_result {
        Ok(response) => {
            println!("Successfully retrieved smart accounts: {:?}", response);
        }
        Err(e) => {
            println!("Error listing smart accounts: {:?}", e);
        }
    }

    Ok(())
}
