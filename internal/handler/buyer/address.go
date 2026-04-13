package buyer

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type AddressHandler struct {
	addressService *service.AddressService
}

type saveAddressRequest struct {
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

func NewAddressHandler(addressService *service.AddressService) *AddressHandler {
	return &AddressHandler{addressService: addressService}
}

// ListAddresses godoc
// @Summary Buyer address list
// @Description Get buyer address list
// @Tags buyer-address
// @Produce json
// @Success 200 {object} response.Envelope
// @Router /buyer/addresses [get]
func (h *AddressHandler) ListAddresses(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	addresses, err := h.addressService.List(c.Request.Context(), userID)
	if err != nil {
		abortAddressSystemError(c)
		return
	}
	response.Success(c, addresses)
}

// CreateAddress godoc
// @Summary Create address
// @Description Create buyer address, max 20 records
// @Tags buyer-address
// @Accept json
// @Produce json
// @Param request body saveAddressRequest true "address payload"
// @Success 200 {object} response.Envelope
// @Router /buyer/addresses [post]
func (h *AddressHandler) CreateAddress(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	var req saveAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	address, err := h.addressService.Create(c.Request.Context(), userID, mapSaveAddressInput(req))
	if err != nil {
		handleAddressServiceError(c, err)
		return
	}
	response.Success(c, address)
}

// UpdateAddress godoc
// @Summary Update address
// @Description Update buyer address
// @Tags buyer-address
// @Accept json
// @Produce json
// @Param id path int true "address id"
// @Param request body saveAddressRequest true "address payload"
// @Success 200 {object} response.Envelope
// @Router /buyer/addresses/{id} [put]
func (h *AddressHandler) UpdateAddress(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	addressID, ok := parseAddressID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	var req saveAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.addressService.Update(c.Request.Context(), userID, addressID, mapSaveAddressInput(req)); err != nil {
		handleAddressServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"updated": true})
}

// DeleteAddress godoc
// @Summary Delete address
// @Description Soft delete buyer address
// @Tags buyer-address
// @Produce json
// @Param id path int true "address id"
// @Success 200 {object} response.Envelope
// @Router /buyer/addresses/{id} [delete]
func (h *AddressHandler) DeleteAddress(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	addressID, ok := parseAddressID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.addressService.Delete(c.Request.Context(), userID, addressID); err != nil {
		handleAddressServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"deleted": true})
}

// SetDefaultAddress godoc
// @Summary Set default address
// @Description Set an existing address as default
// @Tags buyer-address
// @Produce json
// @Param id path int true "address id"
// @Success 200 {object} response.Envelope
// @Router /buyer/addresses/{id}/default [put]
func (h *AddressHandler) SetDefaultAddress(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	addressID, ok := parseAddressID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.addressService.SetDefault(c.Request.Context(), userID, addressID); err != nil {
		handleAddressServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"updated": true})
}

func parseAddressID(raw string) (uint64, bool) {
	value, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || value == 0 {
		return 0, false
	}
	return value, true
}

func mapSaveAddressInput(req saveAddressRequest) service.SaveAddressInput {
	return service.SaveAddressInput{
		ContactName:   req.ContactName,
		ContactPhone:  req.ContactPhone,
		Province:      req.Province,
		City:          req.City,
		District:      req.District,
		DetailAddress: req.DetailAddress,
		Latitude:      req.Latitude,
		Longitude:     req.Longitude,
		IsDefault:     req.IsDefault,
		Tag:           req.Tag,
	}
}

func handleAddressServiceError(c *gin.Context, err error) {
	switch err {
	case service.ErrAddressInvalidInput:
		response.Fail(c, 10001, err.Error())
	case service.ErrAddressLimitExceeded:
		response.Fail(c, 20004, err.Error())
	case service.ErrAddressNotFound:
		response.Fail(c, 10001, err.Error())
	default:
		abortAddressSystemError(c)
	}
}

func abortAddressSystemError(c *gin.Context) {
	c.JSON(http.StatusOK, response.Envelope{
		Code:    10000,
		Message: "system error",
		Data:    nil,
	})
}
