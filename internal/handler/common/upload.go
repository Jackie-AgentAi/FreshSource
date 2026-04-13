package common

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

const (
	uploadFormSingleKey = "file"
	uploadFormMultiKey  = "files"
)

type UploadHandler struct {
	uploadService *service.UploadService
}

func NewUploadHandler(uploadService *service.UploadService) *UploadHandler {
	return &UploadHandler{uploadService: uploadService}
}

// UploadImage godoc
// @Summary Upload one image
// @Description Upload one image file, max 5MB, supported: jpg/jpeg/png/webp
// @Tags common-upload
// @Accept mpfd
// @Produce json
// @Param file formData file true "image file"
// @Success 200 {object} response.Envelope
// @Router /common/upload/image [post]
func (h *UploadHandler) UploadImage(c *gin.Context) {
	file, err := c.FormFile(uploadFormSingleKey)
	if err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	url, err := h.uploadService.SaveSingle(file)
	if err != nil {
		handleUploadError(c, err)
		return
	}

	response.Success(c, gin.H{"url": absoluteURL(c, url)})
}

// UploadImages godoc
// @Summary Upload multiple images
// @Description Upload up to 9 image files, each max 5MB, supported: jpg/jpeg/png/webp
// @Tags common-upload
// @Accept mpfd
// @Produce json
// @Param files formData file true "image files"
// @Success 200 {object} response.Envelope
// @Router /common/upload/images [post]
func (h *UploadHandler) UploadImages(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	files := form.File[uploadFormMultiKey]
	urls, err := h.uploadService.SaveMulti(files)
	if err != nil {
		handleUploadError(c, err)
		return
	}

	result := make([]string, 0, len(urls))
	for _, u := range urls {
		result = append(result, absoluteURL(c, u))
	}
	response.Success(c, gin.H{"urls": result})
}

func handleUploadError(c *gin.Context, err error) {
	switch err {
	case service.ErrUploadTooLarge, service.ErrUploadTypeInvalid, service.ErrUploadTooMany, service.ErrUploadEmpty:
		response.Fail(c, 10001, "invalid request params")
	default:
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
	}
}

func absoluteURL(c *gin.Context, path string) string {
	base := strings.TrimSuffix(c.Request.Host, "/")
	if base == "" {
		return path
	}
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	return scheme + "://" + base + path
}
