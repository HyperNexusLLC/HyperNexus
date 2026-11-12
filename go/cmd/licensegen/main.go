// licensegen generates Ed25519-signed HyperNexus license files.
//
// Usage:
//
//	go run ./cmd/licensegen -keygen -out private.key
//	go run ./cmd/licensegen -key private.key -holder "Acme Corp" -seats 10 -expires 2027-12-31 -out hypernexus.lic
package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"flag"
	"fmt"
	"os"
	"time"
)

func main() {
	keygen := flag.Bool("keygen", false, "Generate a new Ed25519 keypair")
	keyPath := flag.String("key", "", "Path to private key file (hex-encoded seed)")
	holder := flag.String("holder", "", "License holder name")
	seats := flag.Int("seats", 1, "Number of seats")
	expires := flag.String("expires", "", "Expiration date (YYYY-MM-DD or RFC3339)")
	out := flag.String("out", "", "Output file path")
	flag.Parse()

	if *keygen {
		pub, priv, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			fmt.Fprintf(os.Stderr, "key generation failed: %v\n", err)
			os.Exit(1)
		}
		seedHex := hex.EncodeToString(priv.Seed())
		pubHex := hex.EncodeToString(pub)

		outPath := *out
		if outPath == "" {
			outPath = "license-private.key"
		}
		if err := os.WriteFile(outPath, []byte(seedHex+"\n"), 0600); err != nil {
			fmt.Fprintf(os.Stderr, "write key: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("Private key written to %s\n", outPath)
		fmt.Printf("Public key (embed in verifier.go): %s\n", pubHex)
		return
	}

	if *keyPath == "" || *holder == "" || *expires == "" {
		fmt.Fprintln(os.Stderr, "Usage: licensegen -key private.key -holder NAME -seats N -expires DATE [-out FILE]")
		fmt.Fprintln(os.Stderr, "   or: licensegen -keygen [-out private.key]")
		os.Exit(1)
	}

	seedHex, err := os.ReadFile(*keyPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "read key: %v\n", err)
		os.Exit(1)
	}
	seedBytes, err := hex.DecodeString(string(trimNewline(seedHex)))
	if err != nil || len(seedBytes) != ed25519.SeedSize {
		fmt.Fprintf(os.Stderr, "invalid private key (must be %d-byte hex seed)\n", ed25519.SeedSize)
		os.Exit(1)
	}
	priv := ed25519.NewKeyFromSeed(seedBytes)

	// Normalize expiry to RFC3339
	expiryStr := *expires
	if t, err := time.Parse("2006-01-02", *expires); err == nil {
		expiryStr = t.UTC().Format(time.RFC3339)
	}

	msg := fmt.Sprintf("holder:%s\nseats:%d\nexpires_at:%s", *holder, *seats, expiryStr)
	sig := ed25519.Sign(priv, []byte(msg))
	sigHex := hex.EncodeToString(sig)

	lic := fmt.Sprintf("holder: %s\nseats: %d\nexpires_at: %s\nsignature: %s\n", *holder, *seats, expiryStr, sigHex)

	outPath := *out
	if outPath == "" {
		outPath = "hypernexus.lic"
	}
	if err := os.WriteFile(outPath, []byte(lic), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "write license: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("License written to %s\n", outPath)
	fmt.Printf("  holder:  %s\n  seats:   %d\n  expires: %s\n", *holder, *seats, expiryStr)
}

func trimNewline(b []byte) []byte {
	for len(b) > 0 && (b[len(b)-1] == '\n' || b[len(b)-1] == '\r') {
		b = b[:len(b)-1]
	}
	return b
}
