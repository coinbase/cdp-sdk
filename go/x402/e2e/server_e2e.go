// E2E test for the Go x402 facilitator SDK.
//
// Starts a Go HTTP server backed by the CDP facilitator in a goroutine,
// then makes a real x402 V2 payment to it using a raw EVM private key,
// and asserts that the server accepts the payment and returns 200.
//
// Required environment variables:
//
//	CDP_API_KEY_ID, CDP_API_KEY_SECRET — CDP API credentials (for facilitator)
//	PAYER_PRIVATE_KEY                  — Hex private key of the payer wallet
//	RECEIVER_ADDRESS                   — EVM address that receives the payment
//	                                     (must differ from payer to avoid self-payment rejection)
//
// The .env file in the parent directory is loaded automatically.
//
// Run:
//
//	cd go/x402/e2e && go run server_e2e.go
package main

import (
	"bufio"
	"crypto/ecdsa"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	x402 "github.com/x402-foundation/x402/go"

	cdpx402 "github.com/coinbase/cdp-sdk/go/x402"
)

// ─── Constants ────────────────────────────────────────────────────────────────

const (
	serverPort      = ":4022"
	protectedPath   = "/protected"
	usdcBaseSepolia = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
	paymentNetwork  = "eip155:84532" // Base Sepolia
	paymentAmount   = "1000"         // $0.001 USDC (6 decimals)
)

// ─── EIP-712 domain constants for USDC on Base Sepolia ───────────────────────

const (
	usdcName    = "USDC"
	usdcVersion = "2"
	chainID     = 84532
)

var transferWithAuthorizationTypehash = crypto.Keccak256(
	[]byte("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"),
)

var eip712DomainTypehash = crypto.Keccak256(
	[]byte("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
)

// ─── Main ────────────────────────────────────────────────────────────────────

func main() {
	if err := loadEnv(); err != nil {
		log.Fatalf("loadEnv: %v", err)
	}

	privKey, payerAddr, err := loadPrivateKey(os.Getenv("PAYER_PRIVATE_KEY"))
	if err != nil {
		log.Fatalf("PAYER_PRIVATE_KEY: %v", err)
	}

	receiverAddr := os.Getenv("RECEIVER_ADDRESS")
	if receiverAddr == "" {
		log.Fatal("RECEIVER_ADDRESS env var required")
	}

	facilitator, err := cdpx402.CreateCdpFacilitatorClient("", "")
	if err != nil {
		log.Fatalf("facilitator: %v", err)
	}

	requirements := x402.PaymentRequirements{
		Scheme:            "exact",
		Network:           paymentNetwork,
		Asset:             usdcBaseSepolia,
		Amount:            paymentAmount,
		PayTo:             receiverAddr,
		MaxTimeoutSeconds: 300,
		Extra: map[string]interface{}{
			"name":    usdcName,
			"version": usdcVersion,
		},
	}

	ready := make(chan struct{})
	go runServer(facilitator, requirements, ready)
	<-ready

	if err := runPaymentTest(privKey, payerAddr, requirements); err != nil {
		log.Fatalf("payment test failed: %v", err)
	}

	fmt.Println("go facilitator e2e passed")
}

// ─── Server ──────────────────────────────────────────────────────────────────

func runServer(f x402.FacilitatorClient, req x402.PaymentRequirements, ready chan<- struct{}) {
	type paymentRequired struct {
		X402Version int                        `json:"x402Version"`
		Accepts     []x402.PaymentRequirements `json:"accepts"`
	}
	pr := paymentRequired{X402Version: 2, Accepts: []x402.PaymentRequirements{req}}
	prJSON, _ := json.Marshal(pr)
	prB64 := base64.StdEncoding.EncodeToString(prJSON)
	reqJSON, _ := json.Marshal(req)

	mux := http.NewServeMux()
	mux.HandleFunc(protectedPath, func(w http.ResponseWriter, r *http.Request) {
		sig := r.Header.Get("PAYMENT-SIGNATURE")
		if sig == "" {
			w.Header().Set("PAYMENT-REQUIRED", prB64)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusPaymentRequired)
			_, _ = w.Write(prJSON)
			return
		}

		payloadJSON, err := base64.StdEncoding.DecodeString(sig)
		if err != nil {
			http.Error(w, "bad payment header", http.StatusBadRequest)
			return
		}

		vResp, err := f.Verify(r.Context(), payloadJSON, reqJSON)
		if err != nil {
			log.Printf("verify error: %v", err)
			http.Error(w, "verify error", http.StatusPaymentRequired)
			return
		}
		if !vResp.IsValid {
			log.Printf("verify invalid: reason=%q message=%q", vResp.InvalidReason, vResp.InvalidMessage)
			w.Header().Set("PAYMENT-REQUIRED", prB64)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusPaymentRequired)
			_, _ = w.Write(prJSON)
			return
		}

		sResp, err := f.Settle(r.Context(), payloadJSON, reqJSON)
		if err != nil {
			log.Printf("settle error: %v", err)
			http.Error(w, "settle error", http.StatusPaymentRequired)
			return
		}
		if !sResp.Success {
			log.Printf("settle failed: reason=%q message=%q", sResp.ErrorReason, sResp.ErrorMessage)
			http.Error(w, "settle failed", http.StatusPaymentRequired)
			return
		}

		if settleB, err := json.Marshal(sResp); err == nil {
			b64 := base64.StdEncoding.EncodeToString(settleB)
			w.Header().Set("PAYMENT-RESPONSE", b64)
			w.Header().Set("X-PAYMENT-RESPONSE", b64)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"message": "payment accepted"})
	})

	ln, err := net.Listen("tcp", serverPort)
	if err != nil {
		log.Fatalf("listen %s: %v", serverPort, err)
	}
	close(ready)

	if err := http.Serve(ln, mux); err != nil {
		log.Fatalf("serve: %v", err)
	}
}

// ─── Payment client ───────────────────────────────────────────────────────────

func runPaymentTest(privKey *ecdsa.PrivateKey, payerAddr string, req x402.PaymentRequirements) error {
	url := "http://localhost" + serverPort + protectedPath

	resp, err := http.Get(url) //nolint:noctx
	if err != nil {
		return fmt.Errorf("initial request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusPaymentRequired {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("expected 402, got %d: %s", resp.StatusCode, body)
	}
	_, _ = io.ReadAll(resp.Body) // drain

	payload, err := buildPaymentPayload(privKey, payerAddr, req)
	if err != nil {
		return fmt.Errorf("build payment: %w", err)
	}
	payloadJSON, _ := json.Marshal(payload)
	payloadB64 := base64.StdEncoding.EncodeToString(payloadJSON)

	retryReq, _ := http.NewRequest(http.MethodGet, url, nil)
	retryReq.Header.Set("PAYMENT-SIGNATURE", payloadB64)

	client := &http.Client{Timeout: 60 * time.Second}
	resp2, err := client.Do(retryReq)
	if err != nil {
		return fmt.Errorf("payment request: %w", err)
	}
	defer func() { _ = resp2.Body.Close() }()

	body, _ := io.ReadAll(resp2.Body)
	if resp2.StatusCode != http.StatusOK {
		return fmt.Errorf("expected 200, got %d: %s", resp2.StatusCode, body)
	}

	var result map[string]string
	if err := json.Unmarshal(body, &result); err != nil || result["message"] != "payment accepted" {
		return fmt.Errorf("unexpected body: %s", body)
	}

	return nil
}

func buildPaymentPayload(privKey *ecdsa.PrivateKey, from string, req x402.PaymentRequirements) (x402.PaymentPayload, error) {
	validAfter := big.NewInt(0)
	validBefore := big.NewInt(time.Now().Add(5 * time.Minute).Unix())

	var nonce [32]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return x402.PaymentPayload{}, fmt.Errorf("generate nonce: %w", err)
	}

	sig, err := signTransferWithAuthorization(privKey, from, req.PayTo, req.Amount, validAfter, validBefore, nonce)
	if err != nil {
		return x402.PaymentPayload{}, err
	}

	return x402.PaymentPayload{
		X402Version: 2,
		Payload: map[string]any{
			"authorization": map[string]any{
				"from":        from,
				"to":          req.PayTo,
				"value":       req.Amount,
				"validAfter":  validAfter.String(),
				"validBefore": validBefore.String(),
				"nonce":       "0x" + hex.EncodeToString(nonce[:]),
			},
			"signature": sig,
		},
		Accepted: req,
	}, nil
}

// ─── EIP-712 signing ─────────────────────────────────────────────────────────

func signTransferWithAuthorization(
	privKey *ecdsa.PrivateKey,
	from, to, value string,
	validAfter, validBefore *big.Int,
	nonce [32]byte,
) (string, error) {
	valueBig, ok := new(big.Int).SetString(value, 10)
	if !ok {
		return "", fmt.Errorf("invalid amount %q", value)
	}

	domainSep := computeDomainSeparator()
	msgHash := computeMessageHash(
		common.HexToAddress(from),
		common.HexToAddress(to),
		valueBig, validAfter, validBefore, nonce,
	)

	finalHash := crypto.Keccak256(
		[]byte{0x19, 0x01},
		domainSep,
		msgHash,
	)

	sigBytes, err := crypto.Sign(finalHash, privKey)
	if err != nil {
		return "", fmt.Errorf("sign: %w", err)
	}
	sigBytes[64] += 27 // adjust v: go-ethereum returns 0/1, Ethereum expects 27/28

	return "0x" + hex.EncodeToString(sigBytes), nil
}

func computeDomainSeparator() []byte {
	return crypto.Keccak256(
		eip712DomainTypehash,
		crypto.Keccak256([]byte(usdcName)),
		crypto.Keccak256([]byte(usdcVersion)),
		padUint256(big.NewInt(chainID)),
		padAddress(common.HexToAddress(usdcBaseSepolia)),
	)
}

func computeMessageHash(from, to common.Address, value, validAfter, validBefore *big.Int, nonce [32]byte) []byte {
	return crypto.Keccak256(
		transferWithAuthorizationTypehash,
		padAddress(from),
		padAddress(to),
		padUint256(value),
		padUint256(validAfter),
		padUint256(validBefore),
		nonce[:],
	)
}

func padAddress(addr common.Address) []byte {
	b := make([]byte, 32)
	copy(b[12:], addr.Bytes())
	return b
}

func padUint256(n *big.Int) []byte {
	b := make([]byte, 32)
	nb := n.Bytes()
	copy(b[32-len(nb):], nb)
	return b
}

// ─── Key loading ─────────────────────────────────────────────────────────────

func loadPrivateKey(hexKey string) (*ecdsa.PrivateKey, string, error) {
	hexKey = strings.TrimPrefix(hexKey, "0x")
	if hexKey == "" {
		return nil, "", fmt.Errorf("PAYER_PRIVATE_KEY not set")
	}
	privKey, err := crypto.HexToECDSA(hexKey)
	if err != nil {
		return nil, "", fmt.Errorf("parse private key: %w", err)
	}
	addr := crypto.PubkeyToAddress(privKey.PublicKey)
	return privKey, addr.Hex(), nil
}

// ─── .env loader ─────────────────────────────────────────────────────────────

func loadEnv() error {
	envPath := filepath.Join(filepath.Dir("."), "../../../.env")
	file, err := os.Open(envPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("open %s: %w", envPath, err)
	}
	defer func() { _ = file.Close() }()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		key := strings.TrimSpace(parts[0])
		if key == "" {
			continue
		}
		val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
		if os.Getenv(key) == "" {
			_ = os.Setenv(key, val)
		}
	}
	return scanner.Err()
}
