package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	exampleName := os.Args[1]

	switch exampleName {
	case "send_transaction":
		SendTransactionExample()
	case "send_user_operation":
		SendUserOperationExample()
	default:
		fmt.Printf("Unknown example: %s\n", exampleName)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Usage: go run . <example_name>")
	fmt.Println("Available examples:")
	fmt.Println("  send_transaction    - Create an EVM account and send a transaction")
	fmt.Println("  send_user_operation - Create a smart account and send a user operation")
}