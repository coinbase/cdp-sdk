package main

import (
	"context"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"
	"time"

	cdp "github.com/coinbase/cdp-sdk/go"
	"github.com/coinbase/cdp-sdk/go/openapi"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/joho/godotenv"
)

// main is an example script that shows how to create an EVM Account and sign a transaction.
func main() {
	ctx := context.Background()

	cdp, err := createCDPClient()
	if err != nil {
		log.Fatalf("Failed to create CDP client: %v", err)
	}

	evmAddress, err := createEVMAccount(ctx, cdp)
	if err != nil {
		log.Printf("Failed to create EVM account: %v", err)
	}

	if err := faucetEVMAccount(ctx, cdp, evmAddress); err != nil {
		log.Printf("Failed to faucet EVM address: %v", err)
	}

	signedTransaction, err := createAndSignEVMTransaction(ctx, cdp, evmAddress)
	if err != nil {
		log.Printf("Failed to sign transaction: %v", err)
	}

	if err := sendSignedEVMTransaction(ctx, signedTransaction); err != nil {
		log.Printf("Failed to send transaction: %v", err)
	}
}

// createCDPClient creates and returns a new CDP client using environment variables for configuration.
func createCDPClient() (*openapi.ClientWithResponses, error) {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file: %w", err)
	}

	apiKeyID := os.Getenv("CDP_API_KEY_ID")
	if apiKeyID == "" {
		log.Fatal("CDP_API_KEY_ID environment variable is required")
	}

	apiKeySecret := os.Getenv("CDP_API_KEY_SECRET")
	if apiKeySecret == "" {
		log.Fatal("CDP_API_KEY_SECRET environment variable is required")
	}

	walletSecret := os.Getenv("CDP_WALLET_SECRET")
	if walletSecret == "" {
		log.Fatal("CDP_WALLET_SECRET environment variable is required")
	}

	apiURL := os.Getenv("CDP_API_URL")

	cdp, err := cdp.NewClient(cdp.ClientOptions{
		APIKeyID:     apiKeyID,
		APIKeySecret: apiKeySecret,
		WalletSecret: walletSecret,
		BasePath:     apiURL,
	})
	if err != nil {
		return nil, err
	}

	return cdp, nil
}

// createEVMAccount creates a new EVM account using the CDP client.
func createEVMAccount(ctx context.Context, cdp *openapi.ClientWithResponses) (string, error) {
	log.Println("Creating EVM account...")

	response, err := cdp.CreateEvmAccountWithResponse(
		ctx,
		nil,
		openapi.CreateEvmAccountJSONRequestBody{},
	)
	if err != nil {
		return "", err
	}

	if response.StatusCode() != 201 {
		return "", fmt.Errorf("failed to create EVM account: %v", response.Status())
	}

	evmAddress := response.JSON201.Address
	log.Printf("EVM account created: %v", evmAddress)
	return evmAddress, nil
}

// faucetEVMAccount requests test ETH from the faucet for the given EVM address on Base Sepolia.
func faucetEVMAccount(ctx context.Context, cdp *openapi.ClientWithResponses, evmAddress string) error {
	log.Printf("Fauceting EVM address on Base Sepolia: %v", evmAddress)

	response, err := cdp.RequestEvmFaucetWithResponse(
		ctx,
		openapi.RequestEvmFaucetJSONRequestBody{
			Address: evmAddress,
			Network: openapi.RequestEvmFaucetJSONBodyNetwork("base-sepolia"),
			Token:   openapi.RequestEvmFaucetJSONBodyToken("eth"),
		},
	)
	if err != nil {
		return err
	}

	if response.StatusCode() != 200 {
		return fmt.Errorf("failed to faucet EVM address: %v", response.Status())
	}

	log.Println("Fauceted EVM address on Base Sepolia")

	// Sleep to allow faucet transaction to propagate
	log.Println("Sleeping for 8 seconds to allow faucet transaction to propagate...")
	time.Sleep(8 * time.Second)

	return nil
}

// createAndSignEVMTransaction creates and signs an EVM transaction using the CDP client.
func createAndSignEVMTransaction(ctx context.Context, cdp *openapi.ClientWithResponses, evmAddress string) (string, error) {
	toAddress := common.HexToAddress("0x450B2dC4Ba2a08E58C7ECc3DE48e3C825262caF8")

	transaction := types.DynamicFeeTx{
		ChainID:   big.NewInt(84532),
		Nonce:     0,
		To:        &toAddress,
		Value:     big.NewInt(10000000000000), // 0.00001 ETH
		Data:      []byte{},
		Gas:       21000,
		GasFeeCap: big.NewInt(1000000000), // 1 gwei max fee
		GasTipCap: big.NewInt(100000000),  // 0.1 gwei max priority fee
	}

	// Serialize transaction to RLP
	rlpTx := types.NewTx(&transaction)
	rlpData, err := rlpTx.MarshalBinary()
	if err != nil {
		return "", err
	}

	rlpHex := hex.EncodeToString(rlpData)
	rlpHex = "0x" + rlpHex

	response, err := cdp.SignEvmTransactionWithResponse(
		ctx,
		evmAddress,
		nil,
		openapi.SignEvmTransactionJSONRequestBody{
			Transaction: rlpHex,
		},
	)
	if err != nil {
		return "", err
	}

	if response.StatusCode() != 200 {
		return "", fmt.Errorf("failed to sign transaction: %v", response.Status())
	}

	log.Printf("Signed transaction: %v", response.JSON200.SignedTransaction)
	return response.JSON200.SignedTransaction, nil
}

// sendSignedEVMTransaction sends a signed EVM transaction to the network.
func sendSignedEVMTransaction(ctx context.Context, signedTransaction string) error {
	log.Println("Sending signed EVM transaction...")

	ethClient, err := ethclient.Dial("https://sepolia.base.org")
	if err != nil {
		return fmt.Errorf("failed to dial Base Sepolia client: %v", err)
	}

	signedTxBytes, err := hex.DecodeString(strings.TrimPrefix(signedTransaction, "0x"))
	if err != nil {
		return fmt.Errorf("failed to decode signed transaction hex: %v", err)
	}

	var tx types.Transaction
	if err := tx.UnmarshalBinary(signedTxBytes); err != nil {
		return fmt.Errorf("failed to unmarshal signed transaction: %v", err)
	}

	err = ethClient.SendTransaction(ctx, &tx)
	if err != nil {
		return fmt.Errorf("failed to send transaction: %v", err)
	}

	log.Printf("Transaction sent: %v", tx.Hash())

	// Wait up to 10 seconds for transaction confirmation
	time.Sleep(2 * time.Second) // Initial delay to allow transaction to propagate

	for i := 0; i < 4; i++ { // Try 4 more times (total ~10 seconds with delays)
		receipt, err := ethClient.TransactionReceipt(ctx, tx.Hash())
		if err == nil {
			log.Printf("Transaction confirmed in block %d", receipt.BlockNumber)
			return nil
		}
		if err != ethereum.NotFound {
			return fmt.Errorf("error checking transaction receipt: %v", err)
		}
		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("transaction not confirmed after 10 seconds")
}
