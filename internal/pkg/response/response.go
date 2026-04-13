package response

import "github.com/gin-gonic/gin"

type Envelope struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

type Pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type PaginatedData struct {
	List       interface{} `json:"list"`
	Pagination Pagination  `json:"pagination"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(200, Envelope{
		Code:    0,
		Message: "success",
		Data:    data,
	})
}

func Fail(c *gin.Context, code int, message string) {
	c.JSON(200, Envelope{
		Code:    code,
		Message: message,
		Data:    nil,
	})
}

func BuildPagination(page, pageSize, total int) Pagination {
	totalPages := 0
	if pageSize > 0 {
		totalPages = (total + pageSize - 1) / pageSize
	}
	return Pagination{
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
	}
}
