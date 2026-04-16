package testutils

import "github.com/gin-gonic/gin"

type ConfigTest struct {
	DB_URL         string
	JWT_SECRET     string
	REFRESH_SECRET string
}

var EnvTest *ConfigTest

type Route struct {
	Method   string
	Endpoint string
	Handler  gin.HandlerFunc
}
