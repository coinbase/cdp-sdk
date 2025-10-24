package main

import (
	"context"
	"fmt"
	"log"
	"math/big"

	"github.com/coinbase/cdp-sdk/go/openapi"
	"github.com/ethereum/go-ethereum/params"
)

// SendUserOperationExample is an example script that shows how to create a smart account and send a user operation.
func SendUserOperationExample() {
	ctx := context.Background()

	cdp, err := createCDPClient()
	if err != nil {
		log.Fatalf("Failed to create CDP client: %v", err)
	}

	name := "eoa"

	owner, err := getOrCreateEvmAccount(ctx, &name, cdp)
	if err != nil {
		log.Printf("Failed to create EVM account: %v", err)
	}

	fmt.Printf("EVM account created: %v\n", owner)

	smartAccountName := "smart"

	smartAccount, err := getOrCreateSmartAccount(ctx, owner, smartAccountName, cdp)
	if err != nil {
		log.Printf("Failed to create Smart account: %v", err)
	}

	fmt.Printf("Smart account created: %v\n", smartAccount)

	if err := faucetEVMAccount(ctx, cdp, smartAccount); err != nil {
		log.Printf("Failed to faucet EVM address: %v", err)
	}

	userOpHash, err := prepareAndSendUserOperation(ctx, smartAccount, owner, cdp)
	if err != nil {
		log.Printf("Failed to send transaction: %v", err)
	}

	fmt.Printf("userOpHash sent: https://base-sepolia.blockscout.com/op/%s\n", userOpHash)
}

// getOrCreateSmartAccount creates a new Smart account using the CDP client.
func getOrCreateSmartAccount(ctx context.Context, owner string, name string, cdp *openapi.ClientWithResponses) (string, error) {
	log.Println("Creating EVM Smart account...")

	getResp, err := cdp.GetEvmSmartAccountByNameWithResponse(ctx, name)
	if err != nil {
		return "", err
	}

	if getResp.StatusCode() == 200 {
		for _, addr := range getResp.JSON200.Owners {
			if addr == owner {
				return getResp.JSON200.Address, nil
			}
		}

		return "", fmt.Errorf("account with name %s does not have owner %s", name, owner)
	}

	if getResp.StatusCode() != 404 {
		return "", fmt.Errorf("failed to find smart account with name %s: %s", name, string(getResp.Body))
	}

	response, err := cdp.CreateEvmSmartAccountWithResponse(
		ctx,
		&openapi.CreateEvmSmartAccountParams{},
		openapi.CreateEvmSmartAccountJSONRequestBody{
			Owners: []string{
				owner,
			},
		},
	)
	if err != nil {
		return "", err
	}

	if response.StatusCode() != 201 {
		return "", fmt.Errorf("failed to create EVM smart account: %v", string(response.Body))
	}

	smartAccountAddress := response.JSON201.Address
	log.Printf("Smart account created: %v", smartAccountAddress)
	return smartAccountAddress, nil
}

func prepareAndSendUserOperation(ctx context.Context, address string, owner string, cdp *openapi.ClientWithResponses) (string, error) {
	val, err := parseEther("0.000001")
	if err != nil {
		return "", err
	}

	response, err := cdp.PrepareAndSendUserOperationWithResponse(
		ctx,
		address,
		nil,
		openapi.PrepareAndSendUserOperationJSONRequestBody{
			Calls: []openapi.EvmCall{
				{
					To:    "0x0000000000000000000000000000000000000000",
					Value: val,
					Data:  "0x",
				},
			},
			Network:      "base-sepolia",
			PaymasterUrl: nil, // Gas for all base-sepolia user operations are covered by CDP.
		},
	)

	if err != nil {
		return "", err
	}

	if response.StatusCode() != 200 {
		return "", fmt.Errorf("failed to prepare and send user op: %v", response.Status())
	}

	return response.JSON200.UserOpHash, nil
}

func parseEther(val string) (string, error) {
	f, ok := new(big.Float).SetString(val)
	if !ok {
		return "", fmt.Errorf("invalid number: %s", val)
	}

	scale := new(big.Float).SetInt(big.NewInt(params.Ether))
	f.Mul(f, scale)

	result := new(big.Int)
	f.Int(result)

	return result.String(), nil
}
