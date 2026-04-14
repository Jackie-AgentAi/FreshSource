package service

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"

	"freshmart/internal/model"
	"freshmart/internal/pkg/auth"
	"freshmart/internal/repository"
)

const (
	accessTokenTTL    = 2 * time.Hour
	refreshTokenTTL   = 7 * 24 * time.Hour
	defaultBuyerRole  = 1
	defaultUserStatus = 1
)

var (
	ErrPhoneRegistered   = errors.New("phone already registered")
	ErrInvalidCredential = errors.New("invalid credential")
	ErrInvalidSMSCode    = errors.New("sms code invalid")
	ErrInvalidToken      = errors.New("refresh token invalid")
	ErrInvalidPassword   = errors.New("password invalid")
	ErrUserDisabled      = errors.New("account disabled")
)

type AuthService struct {
	userRepo   *repository.UserRepository
	smsService *SMSService
	jwtSecret  string

	mu            sync.Mutex
	refreshTokens map[string]time.Time
}

type AuthTokens struct {
	AccessToken      string
	RefreshToken     string
	AccessExpiresIn  int
	RefreshExpiresIn int
}

func NewAuthService(userRepo *repository.UserRepository, smsService *SMSService, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:      userRepo,
		smsService:    smsService,
		jwtSecret:     strings.TrimSpace(jwtSecret),
		refreshTokens: make(map[string]time.Time),
	}
}

func (s *AuthService) Register(ctx context.Context, phone, smsCode, password string) (AuthTokens, *model.User, error) {
	normalizedPhone := strings.TrimSpace(phone)
	exists, err := s.userRepo.ExistsByPhone(ctx, normalizedPhone)
	if err != nil {
		return AuthTokens{}, nil, err
	}
	if exists {
		return AuthTokens{}, nil, ErrPhoneRegistered
	}
	if !s.smsService.VerifyCode(normalizedPhone, "register", smsCode) {
		return AuthTokens{}, nil, ErrInvalidSMSCode
	}
	if !isValidPassword(password) {
		return AuthTokens{}, nil, ErrInvalidPassword
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return AuthTokens{}, nil, err
	}

	user := &model.User{
		Phone:        normalizedPhone,
		PasswordHash: string(hash),
		Nickname:     "用户" + suffix(phone, 4),
		Role:         defaultBuyerRole,
		Status:       defaultUserStatus,
	}

	if err = s.userRepo.Create(ctx, nil, user); err != nil {
		return AuthTokens{}, nil, err
	}

	tokens, err := s.issueTokens(int64(user.ID), user.Role)
	if err != nil {
		return AuthTokens{}, nil, err
	}
	return tokens, user, nil
}

func (s *AuthService) LoginByPassword(ctx context.Context, phone, password string) (AuthTokens, *model.User, error) {
	user, err := s.userRepo.FindByPhone(ctx, strings.TrimSpace(phone))
	if err != nil {
		return AuthTokens{}, nil, ErrInvalidCredential
	}
	if user.Status != 1 {
		return AuthTokens{}, nil, ErrUserDisabled
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return AuthTokens{}, nil, ErrInvalidCredential
	}

	tokens, err := s.issueTokens(int64(user.ID), user.Role)
	if err != nil {
		return AuthTokens{}, nil, err
	}
	return tokens, user, nil
}

func (s *AuthService) LoginBySMS(ctx context.Context, phone, smsCode string) (AuthTokens, *model.User, error) {
	if !s.smsService.VerifyCode(phone, "login", smsCode) {
		return AuthTokens{}, nil, ErrInvalidSMSCode
	}

	user, err := s.userRepo.FindByPhone(ctx, strings.TrimSpace(phone))
	if err != nil {
		return AuthTokens{}, nil, ErrInvalidCredential
	}
	if user.Status != 1 {
		return AuthTokens{}, nil, ErrUserDisabled
	}

	tokens, err := s.issueTokens(int64(user.ID), user.Role)
	if err != nil {
		return AuthTokens{}, nil, err
	}
	return tokens, user, nil
}

func (s *AuthService) Refresh(refreshToken string) (AuthTokens, error) {
	claims, err := auth.ParseRefreshToken(strings.TrimSpace(refreshToken), s.jwtSecret)
	if err != nil {
		return AuthTokens{}, ErrInvalidToken
	}

	if !s.isRefreshTokenActive(refreshToken) {
		return AuthTokens{}, ErrInvalidToken
	}

	s.invalidateRefreshToken(refreshToken)
	return s.issueTokens(claims.UserID, claims.Role)
}

func (s *AuthService) Logout(refreshToken string) {
	s.invalidateRefreshToken(strings.TrimSpace(refreshToken))
}

func (s *AuthService) issueTokens(userID int64, role int) (AuthTokens, error) {
	accessToken, err := auth.NewAccessToken(userID, role, s.jwtSecret, accessTokenTTL)
	if err != nil {
		return AuthTokens{}, err
	}
	refreshToken, err := auth.NewRefreshToken(userID, role, s.jwtSecret, refreshTokenTTL)
	if err != nil {
		return AuthTokens{}, err
	}

	s.storeRefreshToken(refreshToken, time.Now().Add(refreshTokenTTL))

	return AuthTokens{
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		AccessExpiresIn:  int(accessTokenTTL.Seconds()),
		RefreshExpiresIn: int(refreshTokenTTL.Seconds()),
	}, nil
}

func (s *AuthService) storeRefreshToken(token string, expireAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshTokens[token] = expireAt
}

func (s *AuthService) invalidateRefreshToken(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.refreshTokens, token)
}

func (s *AuthService) isRefreshTokenActive(token string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	expireAt, ok := s.refreshTokens[token]
	if !ok {
		return false
	}
	if time.Now().After(expireAt) {
		delete(s.refreshTokens, token)
		return false
	}
	return true
}

func isValidPassword(password string) bool {
	pwd := strings.TrimSpace(password)
	if len(pwd) < 8 || len(pwd) > 20 {
		return false
	}

	hasLetter := false
	hasDigit := false
	for _, ch := range pwd {
		if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') {
			hasLetter = true
		}
		if ch >= '0' && ch <= '9' {
			hasDigit = true
		}
	}
	return hasLetter && hasDigit
}

func suffix(s string, n int) string {
	runes := []rune(strings.TrimSpace(s))
	if len(runes) <= n {
		return string(runes)
	}
	return string(runes[len(runes)-n:])
}
