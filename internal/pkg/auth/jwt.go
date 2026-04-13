package auth

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("invalid token")

type Claims struct {
	UserID    int64  `json:"user_id"`
	Role      int    `json:"role"`
	TokenType string `json:"token_type,omitempty"`
	jwt.RegisteredClaims
}

func ParseAccessToken(tokenString, secret string) (Claims, error) {
	claims, err := parseToken(tokenString, secret)
	if err != nil {
		return Claims{}, err
	}
	if claims.TokenType != "" && claims.TokenType != "access" {
		return Claims{}, ErrInvalidToken
	}
	return claims, nil
}

func ParseRefreshToken(tokenString, secret string) (Claims, error) {
	claims, err := parseToken(tokenString, secret)
	if err != nil {
		return Claims{}, err
	}
	if claims.TokenType != "refresh" {
		return Claims{}, ErrInvalidToken
	}
	return claims, nil
}

func parseToken(tokenString, secret string) (Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if token.Method == nil || token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})
	if err != nil {
		return Claims{}, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return Claims{}, ErrInvalidToken
	}

	return *claims, nil
}

func NewAccessToken(userID int64, role int, secret string, ttl time.Duration) (string, error) {
	return newToken(userID, role, "access", secret, ttl)
}

func NewRefreshToken(userID int64, role int, secret string, ttl time.Duration) (string, error) {
	return newToken(userID, role, "refresh", secret, ttl)
}

func newToken(userID int64, role int, tokenType, secret string, ttl time.Duration) (string, error) {
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID:    userID,
		Role:      role,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenType + "-" + strconv.FormatInt(now.UnixNano(), 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	})
	return token.SignedString([]byte(secret))
}
