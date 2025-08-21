use cdp_sdk::{auth::WalletAuth, types, Client, CDP_BASE_URL};
use reqwest_middleware::ClientBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the CDP client
    let wallet_auth = WalletAuth::builder().build()?;
    let http_client = ClientBuilder::new(reqwest::Client::new())
        .with(wallet_auth)
        .build();
    let client = Client::new_with_client(CDP_BASE_URL, http_client);

    println!("🏦 EVM Account Management Example");
    println!("=================================\n");

    // 1. Create a new EVM account
    println!("1. Creating a new EVM account...");
    let create_body = types::CreateEvmAccountBody::builder().name(Some("my-demo-account".parse()?));

    let response = client
        .create_evm_account()
        .x_wallet_auth("")
        .body(create_body)
        .send()
        .await?;

    let account = response.into_inner();
    println!("✅ Created account: {}", &*account.address);
    println!("   Name: {:?}", account.name);

    // 2. Get account by address
    println!("\n2. Retrieving account by address...");
    let get_response = client
        .get_evm_account()
        .address(&*account.address)
        .send()
        .await?;

    let retrieved_account = get_response.into_inner();
    println!("✅ Retrieved account: {}", &*retrieved_account.address);
    println!("   Name: {:?}", retrieved_account.name);

    // 3. Get account by name
    println!("\n3. Retrieving account by name...");
    let get_by_name_response = client
        .get_evm_account_by_name()
        .name("my-demo-account")
        .send()
        .await?;

    let account_by_name = get_by_name_response.into_inner();
    println!("✅ Found account by name: {}", &*account_by_name.address);

    // 4. List all accounts
    println!("\n4. Listing all EVM accounts...");
    let list_response = client.list_evm_accounts().page_size(5).send().await?;

    let accounts_list = list_response.into_inner();
    println!("✅ Found {} accounts:", accounts_list.accounts.len());
    for (i, acc) in accounts_list.accounts.iter().enumerate() {
        println!("   {}. {} - {:?}", i + 1, &*acc.address, acc.name);
    }

    // 5. Update account name
    println!("\n5. Updating account name...");
    let update_body =
        types::UpdateEvmAccountBody::builder().name(Some("my-updated-account".parse()?));

    let update_response = client
        .update_evm_account()
        .address(&*account.address)
        .body(update_body)
        .send()
        .await?;

    let updated_account = update_response.into_inner();
    println!("✅ Updated account name: {:?}", updated_account.name);

    println!("\n🎉 EVM Account Management Complete!");
    Ok(())
}
