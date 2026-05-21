use cdp_sdk::{auth::WalletAuth, types, Client, CDP_BASE_URL};
use dotenv::dotenv;
use reqwest_middleware::ClientBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let wallet_auth = WalletAuth::builder().build()?;
    let http_client = ClientBuilder::new(reqwest::Client::new())
        .with(wallet_auth)
        .build();
    let client = Client::new_with_client(CDP_BASE_URL, http_client);

    // 1. List accounts
    let accounts_response = client.list_foundation_accounts().send().await?;
    let accounts = accounts_response.into_inner();
    println!("Found {} accounts:", accounts.accounts.len());
    for account in &accounts.accounts {
        println!(
            "  {} ({}) - type: {:?}",
            *account.account_id,
            account.name.as_ref().map(|n| n.as_str()).unwrap_or(""),
            account.type_
        );
    }

    if accounts.accounts.is_empty() {
        println!("No accounts found. Create one in the CDP dashboard first.");
        return Ok(());
    }

    // 2. Get balances for the first account
    let account = &accounts.accounts[0];
    let balances_response = client
        .list_balances()
        .account_id(&account.account_id)
        .send()
        .await?;
    let balances = balances_response.into_inner();
    println!("\nBalances for {}:", account.name.as_ref().map(|n| n.as_str()).unwrap_or(""));
    for balance in &balances.balances {
        let total = balance
            .amount
            .get(balance.asset.symbol.as_str())
            .map(|d| d.available.as_str())
            .unwrap_or("0");
        println!("  {}: {}", balance.asset.symbol.as_str(), total);
    }

    // 3. Create a quoted transfer (execute: false — no funds move)
    let source = types::CreateTransferSource::TransfersAccount(types::TransfersAccount {
        account_id: account.account_id.to_string(),
        asset: "usd".parse()?,
    });

    let target = types::TransferTarget::OnchainAddress(types::OnchainAddress {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".parse()?,
        network: "base".parse()?,
        asset: "usdc".parse()?,
        destination_tag: None,
    });

    let transfer_body = types::TransferRequest::builder()
        .source(source)
        .target(target)
        .amount("10.00")
        .asset("usd".parse::<types::Asset>()?)
        .execute(false);

    let transfer_response = client
        .create_transfer()
        .body(transfer_body)
        .send()
        .await?;
    let transfer = transfer_response.into_inner();
    println!(
        "\nCreated transfer {}:",
        transfer.transfer_id.as_deref().unwrap_or("unknown")
    );
    println!("  Status: {:?}", transfer.status);
    println!(
        "  Source: {} {}",
        transfer.source_amount.as_deref().unwrap_or(""),
        transfer.source_asset.as_ref().map(|a| a.as_str()).unwrap_or("")
    );
    println!(
        "  Target: {} {}",
        transfer.target_amount.as_deref().unwrap_or(""),
        transfer.target_asset.as_ref().map(|a| a.as_str()).unwrap_or("")
    );
    println!(
        "  Expires: {}",
        transfer
            .expires_at
            .map(|d| d.to_string())
            .unwrap_or_default()
    );

    // 4. List recent transfers
    let transfers_response = client
        .list_transfers()
        .status("quoted".parse::<types::TransferStatus>()?)
        .send()
        .await?;
    let transfers = transfers_response.into_inner();
    println!("\n{} quoted transfers found.", transfers.transfers.len());

    Ok(())
}
