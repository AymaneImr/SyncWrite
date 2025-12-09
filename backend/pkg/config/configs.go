package config

import (
	"fmt"
	"log"
	"os"
)

type Config struct {
	DB_URL         string
	JWT_SECRET     string
	REFRESH_SECRET string
}

var Env *Config

func LoadConfig() {
	Env = &Config{
		DB_URL:         BuildDBURL(),
		JWT_SECRET:     os.Getenv("JWT_SECRET"),
		REFRESH_SECRET: os.Getenv("REFRESH_SECRET"),
	}

	if Env.JWT_SECRET == "" {
		log.Fatal("JWT_SECRET is missing!")
	}
}

type DBConfig struct {
	Protocol string
	Username string
	Password string
	Host     string
	Port     string
	DBName   string
	SSLMode  string
}

var DbConfig *DBConfig

func BuildDBURL() string {
	GetDbConfig()
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		DbConfig.Username,
		DbConfig.Password,
		DbConfig.Host,
		DbConfig.Port,
		DbConfig.DBName,
		DbConfig.SSLMode,
	)
}

var DevelopmentMode = true

func GetDbConfig() {
	var ssl_mode string
	if !DevelopmentMode {
		ssl_mode = "require"
	}
	ssl_mode = "disable"

	DbConfig = &DBConfig{
		Protocol: os.Getenv("Protocol"),
		Username: os.Getenv("Username"),
		Password: os.Getenv("Password"),
		Host:     os.Getenv("Host"),
		Port:     os.Getenv("Port"),
		DBName:   os.Getenv("DBName"),
		SSLMode:  ssl_mode,
	}
}
