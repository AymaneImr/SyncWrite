package testutils

type ConfigTest struct {
	DB_URL         string
	JWT_SECRET     string
	REFRESH_SECRET string
}

var EnvTest *ConfigTest
