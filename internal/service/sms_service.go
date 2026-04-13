package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

const (
	smsResendCooldown       = 60 * time.Second
	smsDailyLimit           = 10
	defaultMockVerification = "123456"
	smsSceneRegister        = "register"
	smsSceneLogin           = "login"
)

var (
	ErrSMSRateLimited  = errors.New("sms request too frequent")
	ErrSMSDailyLimited = errors.New("sms daily quota exceeded")
	ErrSMSInvalidPhone = errors.New("invalid phone")
	ErrSMSInvalidScene = errors.New("invalid scene")
)

type SMSService struct {
	env      string
	mockCode string

	mu      sync.Mutex
	records map[string]*smsRecord
}

type smsRecord struct {
	LastSentAt time.Time
	DailyCount int
	DailyDate  string
	Code       string
	ExpireAt   time.Time
}

type SendSMSInput struct {
	Phone string
	Scene string
}

type SendSMSResult struct {
	Phone    string
	Scene    string
	MockCode string
	ExpireIn int
}

func NewSMSService(env string) *SMSService {
	return &SMSService{
		env:      strings.TrimSpace(strings.ToLower(env)),
		mockCode: defaultMockVerification,
		records:  make(map[string]*smsRecord),
	}
}

func (s *SMSService) SendCode(_ context.Context, input SendSMSInput) (SendSMSResult, error) {
	phone := strings.TrimSpace(input.Phone)
	scene := strings.TrimSpace(strings.ToLower(input.Scene))

	if !isValidPhone(phone) {
		return SendSMSResult{}, ErrSMSInvalidPhone
	}
	if !isValidScene(scene) {
		return SendSMSResult{}, ErrSMSInvalidScene
	}

	now := time.Now()
	dateKey := now.Format("2006-01-02")
	recordKey := fmt.Sprintf("%s|%s", phone, scene)

	s.mu.Lock()
	defer s.mu.Unlock()

	record := s.records[recordKey]
	if record == nil {
		record = &smsRecord{}
		s.records[recordKey] = record
	}

	if record.DailyDate != dateKey {
		record.DailyDate = dateKey
		record.DailyCount = 0
	}

	if !record.LastSentAt.IsZero() && now.Sub(record.LastSentAt) < smsResendCooldown {
		return SendSMSResult{}, ErrSMSRateLimited
	}

	if record.DailyCount >= smsDailyLimit {
		return SendSMSResult{}, ErrSMSDailyLimited
	}

	record.LastSentAt = now
	record.DailyCount++
	record.Code = s.mockCode
	record.ExpireAt = now.Add(5 * time.Minute)

	result := SendSMSResult{
		Phone:    phone,
		Scene:    scene,
		ExpireIn: 300,
	}

	if s.env != "production" {
		result.MockCode = s.mockCode
	}

	return result, nil
}

func (s *SMSService) VerifyCode(phone, scene, code string) bool {
	phone = strings.TrimSpace(phone)
	scene = strings.TrimSpace(strings.ToLower(scene))
	code = strings.TrimSpace(code)
	if phone == "" || scene == "" || code == "" {
		return false
	}

	recordKey := fmt.Sprintf("%s|%s", phone, scene)
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	record := s.records[recordKey]
	if record == nil {
		return false
	}
	if record.ExpireAt.Before(now) {
		return false
	}
	if record.Code != code {
		return false
	}

	// one-time code: consume after successful verification
	record.Code = ""
	return true
}

func isValidPhone(phone string) bool {
	if len(phone) < 11 || len(phone) > 20 {
		return false
	}
	for _, c := range phone {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func isValidScene(scene string) bool {
	return scene == smsSceneRegister || scene == smsSceneLogin
}
