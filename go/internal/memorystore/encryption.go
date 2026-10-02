package memorystore

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"os"
)

// MemoryEncryption provides AES-256-GCM field-level encryption for memory content at rest.
// Key is derived from HYPERNEXUS_MEMORY_ENCRYPTION_KEY env var (any length, SHA-256 hashed).
// If no key is set, encryption is disabled (plaintext mode).
type MemoryEncryption struct {
	gcm cipher.AEAD
}

// NewMemoryEncryption creates an encryption context from the env key.
// Returns nil (encryption disabled) if HYPERNEXUS_MEMORY_ENCRYPTION_KEY is not set.
func NewMemoryEncryption() *MemoryEncryption {
	keyStr := os.Getenv("HYPERNEXUS_MEMORY_ENCRYPTION_KEY")
	if keyStr == "" {
		return nil
	}
	// Derive 32-byte key from arbitrary-length passphrase
	hash := sha256.Sum256([]byte(keyStr))
	block, err := aes.NewCipher(hash[:])
	if err != nil {
		return nil
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil
	}
	return &MemoryEncryption{gcm: gcm}
}

// Encrypt encrypts plaintext and returns base64-encoded ciphertext with "enc:v1:" prefix.
func (e *MemoryEncryption) Encrypt(plaintext string) (string, error) {
	if e == nil {
		return plaintext, nil
	}
	nonce := make([]byte, e.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := e.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return "enc:v1:" + base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts "enc:v1:" prefixed base64 ciphertext. Passes through plaintext unchanged.
func (e *MemoryEncryption) Decrypt(encoded string) (string, error) {
	if e == nil || len(encoded) < 8 || encoded[:7] != "enc:v1:" {
		return encoded, nil
	}
	data, err := base64.StdEncoding.DecodeString(encoded[7:])
	if err != nil {
		return "", err
	}
	nonceSize := e.gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := e.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

// IsEncrypted returns true if the string has the encryption prefix.
func IsEncrypted(s string) bool {
	return len(s) >= 7 && s[:7] == "enc:v1:"
}
