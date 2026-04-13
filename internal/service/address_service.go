package service

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/repository"
)

const maxAddressCountPerUser = 20

var (
	ErrAddressNotFound      = errors.New("address not found")
	ErrAddressLimitExceeded = errors.New("address count exceeds limit 20")
	ErrAddressInvalidInput  = errors.New("invalid address params")
)

type AddressService struct {
	addressRepo *repository.AddressRepository
}

type SaveAddressInput struct {
	ContactName   string   `json:"contact_name"`
	ContactPhone  string   `json:"contact_phone"`
	Province      string   `json:"province"`
	City          string   `json:"city"`
	District      string   `json:"district"`
	DetailAddress string   `json:"detail_address"`
	Latitude      *float64 `json:"latitude"`
	Longitude     *float64 `json:"longitude"`
	IsDefault     int      `json:"is_default"`
	Tag           string   `json:"tag"`
}

func NewAddressService(addressRepo *repository.AddressRepository) *AddressService {
	return &AddressService{addressRepo: addressRepo}
}

func (s *AddressService) List(ctx context.Context, userID int64) ([]model.UserAddress, error) {
	return s.addressRepo.ListByUserID(ctx, uint64(userID))
}

func (s *AddressService) Create(ctx context.Context, userID int64, input SaveAddressInput) (*model.UserAddress, error) {
	if !isAddressInputValid(input) {
		return nil, ErrAddressInvalidInput
	}
	userIDUint := uint64(userID)
	count, err := s.addressRepo.CountByUserID(ctx, userIDUint)
	if err != nil {
		return nil, err
	}
	if count >= maxAddressCountPerUser {
		return nil, ErrAddressLimitExceeded
	}

	address := &model.UserAddress{
		UserID:        userIDUint,
		ContactName:   strings.TrimSpace(input.ContactName),
		ContactPhone:  strings.TrimSpace(input.ContactPhone),
		Province:      strings.TrimSpace(input.Province),
		City:          strings.TrimSpace(input.City),
		District:      strings.TrimSpace(input.District),
		DetailAddress: strings.TrimSpace(input.DetailAddress),
		Latitude:      input.Latitude,
		Longitude:     input.Longitude,
		IsDefault:     normalizeDefaultFlag(input.IsDefault),
		Tag:           strings.TrimSpace(input.Tag),
	}

	err = s.addressRepo.WithinTransaction(ctx, func(tx *gorm.DB) error {
		if address.IsDefault == 1 || count == 0 {
			if err := s.addressRepo.ClearDefaultByUserID(ctx, tx, userIDUint); err != nil {
				return err
			}
			address.IsDefault = 1
		}
		return s.addressRepo.Create(ctx, tx, address)
	})
	if err != nil {
		return nil, err
	}
	return address, nil
}

func (s *AddressService) Update(ctx context.Context, userID int64, id uint64, input SaveAddressInput) error {
	if !isAddressInputValid(input) || id == 0 {
		return ErrAddressInvalidInput
	}
	userIDUint := uint64(userID)
	return s.addressRepo.WithinTransaction(ctx, func(tx *gorm.DB) error {
		current, err := s.addressRepo.FindByIDAndUserIDForUpdate(ctx, tx, id, userIDUint)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAddressNotFound
			}
			return err
		}

		nextIsDefault := current.IsDefault
		if normalizeDefaultFlag(input.IsDefault) == 1 {
			nextIsDefault = 1
			if err := s.addressRepo.ClearDefaultByUserID(ctx, tx, userIDUint); err != nil {
				return err
			}
		}

		return s.addressRepo.UpdateByIDAndUserID(ctx, tx, current.ID, userIDUint, map[string]interface{}{
			"contact_name":   strings.TrimSpace(input.ContactName),
			"contact_phone":  strings.TrimSpace(input.ContactPhone),
			"province":       strings.TrimSpace(input.Province),
			"city":           strings.TrimSpace(input.City),
			"district":       strings.TrimSpace(input.District),
			"detail_address": strings.TrimSpace(input.DetailAddress),
			"latitude":       input.Latitude,
			"longitude":      input.Longitude,
			"is_default":     nextIsDefault,
			"tag":            strings.TrimSpace(input.Tag),
		})
	})
}

func (s *AddressService) Delete(ctx context.Context, userID int64, id uint64) error {
	if id == 0 {
		return ErrAddressInvalidInput
	}
	userIDUint := uint64(userID)
	return s.addressRepo.WithinTransaction(ctx, func(tx *gorm.DB) error {
		current, err := s.addressRepo.FindByIDAndUserIDForUpdate(ctx, tx, id, userIDUint)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAddressNotFound
			}
			return err
		}
		if err := s.addressRepo.SoftDeleteByIDAndUserID(ctx, tx, current.ID, userIDUint); err != nil {
			return err
		}
		if current.IsDefault != 1 {
			return nil
		}

		next, err := s.addressRepo.FindLatestByUserID(ctx, tx, userIDUint)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}
		return s.addressRepo.UpdateByIDAndUserID(ctx, tx, next.ID, userIDUint, map[string]interface{}{
			"is_default": 1,
		})
	})
}

func (s *AddressService) SetDefault(ctx context.Context, userID int64, id uint64) error {
	if id == 0 {
		return ErrAddressInvalidInput
	}
	userIDUint := uint64(userID)
	return s.addressRepo.WithinTransaction(ctx, func(tx *gorm.DB) error {
		_, err := s.addressRepo.FindByIDAndUserIDForUpdate(ctx, tx, id, userIDUint)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAddressNotFound
			}
			return err
		}
		if err := s.addressRepo.ClearDefaultByUserID(ctx, tx, userIDUint); err != nil {
			return err
		}
		return s.addressRepo.UpdateByIDAndUserID(ctx, tx, id, userIDUint, map[string]interface{}{
			"is_default": 1,
		})
	})
}

func isAddressInputValid(input SaveAddressInput) bool {
	return strings.TrimSpace(input.ContactName) != "" &&
		strings.TrimSpace(input.ContactPhone) != "" &&
		strings.TrimSpace(input.Province) != "" &&
		strings.TrimSpace(input.City) != "" &&
		strings.TrimSpace(input.District) != "" &&
		strings.TrimSpace(input.DetailAddress) != ""
}

func normalizeDefaultFlag(value int) int {
	if value == 1 {
		return 1
	}
	return 0
}
