package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
)

const (
	defaultAppName            = "freshmart-api"
	defaultEnv                = "development"
	defaultPort               = 8080
	defaultJWTSecret          = "freshmart-dev-secret"
	defaultRateLimitPerMinute = 120
)

type Config struct {
	AppName            string
	Env                string
	Port               int
	JWTSecret          string
	RateLimitPerMinute int
	DatabaseDSN        string
}

func Load() (Config, error) {
	cfg := Config{
		AppName:            readStringEnv("APP_NAME", defaultAppName),
		Env:                readStringEnv("APP_ENV", defaultEnv),
		Port:               defaultPort,
		JWTSecret:          readStringEnv("JWT_SECRET", defaultJWTSecret),
		RateLimitPerMinute: defaultRateLimitPerMinute,
		DatabaseDSN:        readStringEnv("DB_DSN", ""),
	}

	port, err := readIntEnv("APP_PORT", defaultPort)
	if err != nil {
		return Config{}, err
	}
	cfg.Port = port

	rateLimitPerMinute, err := readIntEnv("RATE_LIMIT_PER_MINUTE", defaultRateLimitPerMinute)
	if err != nil {
		return Config{}, err
	}
	cfg.RateLimitPerMinute = rateLimitPerMinute

	return cfg, nil
}

func readStringEnv(key, fallback string) string {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	return raw
}

func readIntEnv(key string, fallback int) (int, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("%s must be int: %w", key, err)
	}
	if value <= 0 {
		return 0, errors.New(key + " must be greater than 0")
	}
	return value, nil
}
