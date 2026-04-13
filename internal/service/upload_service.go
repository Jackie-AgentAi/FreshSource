package service

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	maxUploadBytes = 5 * 1024 * 1024
	maxUploadCount = 9
)

var (
	ErrUploadTooLarge    = errors.New("file too large")
	ErrUploadTypeInvalid = errors.New("invalid file type")
	ErrUploadTooMany     = errors.New("too many files")
	ErrUploadEmpty       = errors.New("empty file")
)

var allowedExts = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".webp": {},
}

type UploadService struct {
	storeDir string
}

func NewUploadService(storeDir string) *UploadService {
	dir := strings.TrimSpace(storeDir)
	if dir == "" {
		dir = "uploads"
	}
	return &UploadService{storeDir: dir}
}

func (s *UploadService) SaveSingle(file *multipart.FileHeader) (string, error) {
	if file == nil {
		return "", ErrUploadEmpty
	}
	if err := validateFileHeader(file); err != nil {
		return "", err
	}
	return s.save(file)
}

func (s *UploadService) SaveMulti(files []*multipart.FileHeader) ([]string, error) {
	if len(files) == 0 {
		return nil, ErrUploadEmpty
	}
	if len(files) > maxUploadCount {
		return nil, ErrUploadTooMany
	}

	urls := make([]string, 0, len(files))
	for _, file := range files {
		if err := validateFileHeader(file); err != nil {
			return nil, err
		}
		url, err := s.save(file)
		if err != nil {
			return nil, err
		}
		urls = append(urls, url)
	}
	return urls, nil
}

func validateFileHeader(file *multipart.FileHeader) error {
	if file.Size <= 0 {
		return ErrUploadEmpty
	}
	if file.Size > maxUploadBytes {
		return ErrUploadTooLarge
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if _, ok := allowedExts[ext]; !ok {
		return ErrUploadTypeInvalid
	}
	return nil
}

func (s *UploadService) save(file *multipart.FileHeader) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	head := make([]byte, 512)
	n, _ := io.ReadFull(src, head)
	contentType := strings.ToLower(strings.TrimSpace(http.DetectContentType(head[:n])))
	if !isAllowedContentType(contentType) {
		return "", ErrUploadTypeInvalid
	}

	if _, err = src.Seek(0, io.SeekStart); err != nil {
		return "", err
	}

	if err = os.MkdirAll(s.storeDir, 0o755); err != nil {
		return "", err
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	filename := fmt.Sprintf("%d_%d%s", time.Now().UnixNano(), time.Now().Unix()%100000, ext)
	dstPath := filepath.Join(s.storeDir, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return "", err
	}

	return "/uploads/" + filename, nil
}

func isAllowedContentType(ct string) bool {
	switch ct {
	case "image/jpeg", "image/png", "image/webp":
		return true
	default:
		return false
	}
}
