package service

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/repository"
)

var (
	ErrPhoneAlreadyExists = errors.New("phone already exists")
	errForceRollbackDemo  = errors.New("force rollback demo")
)

type UserService struct {
	txManager *repository.TxManager
	userRepo  *repository.UserRepository
}

func NewUserService(txManager *repository.TxManager, userRepo *repository.UserRepository) *UserService {
	return &UserService{
		txManager: txManager,
		userRepo:  userRepo,
	}
}

func (s *UserService) DemoCreateUserCommit(ctx context.Context, phone string) (*model.User, error) {
	exists, err := s.userRepo.ExistsByPhone(ctx, phone)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrPhoneAlreadyExists
	}

	newUser := &model.User{
		Phone:        phone,
		PasswordHash: "$2b$10$fqsSQYsCcjYLjyN1mrSZZepEHUj2ZUnFsoO8MP6F7lrbIXnb60k66",
		Nickname:     "tx-commit-user",
		Role:         1,
		Status:       1,
	}

	err = s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		return s.userRepo.Create(ctx, tx, newUser)
	})
	if err != nil {
		return nil, err
	}
	return newUser, nil
}

func (s *UserService) DemoCreateUserRollback(ctx context.Context, phone string) error {
	exists, err := s.userRepo.ExistsByPhone(ctx, phone)
	if err != nil {
		return err
	}
	if exists {
		return ErrPhoneAlreadyExists
	}

	newUser := &model.User{
		Phone:        phone,
		PasswordHash: "$2b$10$fqsSQYsCcjYLjyN1mrSZZepEHUj2ZUnFsoO8MP6F7lrbIXnb60k66",
		Nickname:     "tx-rollback-user",
		Role:         1,
		Status:       1,
	}

	txErr := s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		if err := s.userRepo.Create(ctx, tx, newUser); err != nil {
			return err
		}
		return errForceRollbackDemo
	})
	if txErr != nil && !errors.Is(txErr, errForceRollbackDemo) {
		return txErr
	}

	rolledBack, err := s.userRepo.ExistsByPhone(ctx, phone)
	if err != nil {
		return err
	}
	if rolledBack {
		return errors.New("rollback failed")
	}
	return nil
}
