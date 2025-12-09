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
