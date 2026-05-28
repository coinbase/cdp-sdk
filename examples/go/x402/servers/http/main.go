// HTTP resource server protected with x402 and the CDP facilitator.
//
// Requires environment variables:
//
//	CDP_SERVER_API_KEY_ID (or CDP_API_KEY_ID)     — CDP API key ID
//	CDP_SERVER_API_KEY_SECRET (or CDP_API_KEY_SECRET) — CDP API key secret
//	PAY_TO                                        — EVM address that receives payments
//
// Run:
//
//	cd go && go run ../examples/go/servers/http/main.go
package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	cdpx402 "github.com/coinbase/cdp-sdk/go/x402"
	x402 "github.com/x402-foundation/x402/go"
)

func main() {
	payTo := os.Getenv("PAY_TO")
	if payTo == "" {
		log.Fatal("PAY_TO env var required (0x... EVM address)")
	}

	facilitator, err := cdpx402.CreateCdpFacilitatorClient("", "")
	if err != nil {
		log.Fatalf("failed to create facilitator client: %v", err)
	}

	http.HandleFunc("/report", paymentHandler(facilitator, payTo, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"report": "..."})
	}))

	log.Println("Listening on http://localhost:8402")
	log.Fatal(http.ListenAndServe(":8402", nil))
}

// paymentHandler wraps an http.HandlerFunc with x402 verify-then-settle logic.
//
// Flow:
//  1. No x402 payment header (PAYMENT-SIGNATURE/X-PAYMENT) → return 402 challenge.
//  2. Payment header present → verify with facilitator.
//  3. On valid payment → settle and attach PAYMENT-RESPONSE headers, then serve.
func paymentHandler(f x402.FacilitatorClient, payTo string, next http.HandlerFunc) http.HandlerFunc {
	requirement := map[string]any{
		"scheme":            "exact",
		"network":           "eip155:8453",
		"maxTimeoutSeconds": 300,
		"asset":             "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
		"payTo":             payTo,
		"amount":            "10000", // $0.01 in USDC (6 decimals)
	}
	paymentRequired := map[string]any{
		"x402Version": 1,
		"accepts":     []map[string]any{requirement},
	}

	requirementJSON, err := json.Marshal(requirement)
	if err != nil {
		log.Fatalf("failed to marshal payment requirement: %v", err)
	}
	paymentRequiredJSON, err := json.Marshal(paymentRequired)
	if err != nil {
		log.Fatalf("failed to marshal payment required response: %v", err)
	}
	paymentRequiredB64 := base64.StdEncoding.EncodeToString(paymentRequiredJSON)

	return func(w http.ResponseWriter, r *http.Request) {
		writePaymentRequired := func() {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("PAYMENT-REQUIRED", paymentRequiredB64)
			w.WriteHeader(http.StatusPaymentRequired)
			_ = json.NewEncoder(w).Encode(paymentRequired)
		}

		sig := r.Header.Get("PAYMENT-SIGNATURE")
		if sig == "" {
			sig = r.Header.Get("X-PAYMENT")
		}
		if sig == "" {
			writePaymentRequired()
			return
		}

		payloadJSON, err := base64.StdEncoding.DecodeString(sig)
		if err != nil {
			http.Error(w, fmt.Sprintf("invalid payment header: %v", err), http.StatusBadRequest)
			return
		}

		verifyResp, err := f.Verify(r.Context(), payloadJSON, requirementJSON)
		if err != nil || !verifyResp.IsValid {
			writePaymentRequired()
			return
		}

		settleResp, err := f.Settle(r.Context(), payloadJSON, requirementJSON)
		if err != nil || !settleResp.Success {
			writePaymentRequired()
			return
		}
		settleJSON, err := json.Marshal(settleResp)
		if err == nil {
			settleB64 := base64.StdEncoding.EncodeToString(settleJSON)
			// Include both modern and legacy headers for client compatibility.
			w.Header().Set("PAYMENT-RESPONSE", settleB64)
			w.Header().Set("X-PAYMENT-RESPONSE", settleB64)
		}

		next(w, r)
	}
}
