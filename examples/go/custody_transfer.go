package main

import (
	"context"
	"fmt"
	"log"

	"github.com/coinbase/cdp-sdk/go/openapi"
)

func CustodyTransferExample() {
	ctx := context.Background()

	client, err := createCDPClient()
	if err != nil {
		log.Fatalf("Failed to create CDP client: %v", err)
	}

	// 1. List accounts
	accountsResp, err := client.ListFoundationAccountsWithResponse(ctx, &openapi.ListFoundationAccountsParams{})
	if err != nil {
		log.Fatalf("Failed to list accounts: %v", err)
	}
	if accountsResp.JSON200 == nil {
		log.Fatalf("Failed to list accounts: %s", string(accountsResp.Body))
	}
	accounts := accountsResp.JSON200.Accounts
	fmt.Printf("Found %d accounts:\n", len(accounts))
	for _, account := range accounts {
		fmt.Printf("  %s (%s) - type: %s\n", account.AccountId, account.Name, account.Type)
	}

	if len(accounts) == 0 {
		fmt.Println("No accounts found. Create one in the CDP dashboard first.")
		return
	}

	// 2. Get balances for the first account
	account := accounts[0]
	balancesResp, err := client.ListBalancesWithResponse(ctx, account.AccountId, &openapi.ListBalancesParams{})
	if err != nil {
		log.Fatalf("Failed to list balances: %v", err)
	}
	fmt.Printf("\nBalances for %s:\n", account.Name)
	for _, balance := range balancesResp.JSON200.Balances {
		fmt.Printf("  %s: %s\n", balance.Asset, balance.Amount)
	}

	// 3. Create a quoted transfer (execute=false — no funds move)
	var source openapi.CreateTransferSource
	if err := source.FromTransfersAccount(openapi.TransfersAccount{
		AccountId: account.AccountId,
		Asset:     "usd",
	}); err != nil {
		log.Fatalf("Failed to build transfer source: %v", err)
	}

	var target openapi.TransferTarget
	if err := target.FromOnchainAddress(openapi.OnchainAddress{
		Address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
		Network: "base",
		Asset:   "usdc",
	}); err != nil {
		log.Fatalf("Failed to build transfer target: %v", err)
	}

	transferResp, err := client.CreateTransferWithResponse(ctx, &openapi.CreateTransferParams{},
		openapi.CreateTransferJSONRequestBody{
			Source:  source,
			Target:  target,
			Amount:  "10.00",
			Asset:   "usd",
			Execute: false,
		},
	)
	if err != nil {
		log.Fatalf("Failed to create transfer: %v", err)
	}
	transfer := transferResp.JSON200
	fmt.Printf("\nCreated transfer %s:\n", transfer.TransferId)
	fmt.Printf("  Status: %s\n", transfer.Status)
	fmt.Printf("  Source: %s %s\n", transfer.SourceAmount, transfer.SourceAsset)
	fmt.Printf("  Target: %s %s\n", transfer.TargetAmount, transfer.TargetAsset)
	fmt.Printf("  Expires: %s\n", transfer.ExpiresAt)

	// 4. List recent transfers
	status := openapi.TransferStatus("quoted")
	transfersResp, err := client.ListTransfersWithResponse(ctx, &openapi.ListTransfersParams{Status: &status})
	if err != nil {
		log.Fatalf("Failed to list transfers: %v", err)
	}
	fmt.Printf("\n%d quoted transfers found.\n", len(transfersResp.JSON200.Transfers))
}
