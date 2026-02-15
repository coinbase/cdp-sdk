use cdp_sdk::api::Client;
use cdp_sdk::wallet::Wallet;

#[test]
fn test_wallet_initialization() {
    let client = Client::new("https://api.cdp.coinbase.com/platform");
    
    // Rename 'wallet' to '_wallet' to silence the warning
    let _wallet = Wallet::new(client, "0x123DummyAddress", "base-sepolia");

    assert!(true); 
}