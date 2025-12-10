package utils

import (
	"crypto/rand"
	"encoding/hex"
)

func GenerateDocumentLink() string {
	b := make([]byte, 10)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func CanEdit(access string) bool {
	return access == "owner" || access == "read-write"
}

func GenerateSessionToken() string {
	b := make([]byte, 12)
	rand.Read(b)
	return hex.EncodeToString(b)
}
