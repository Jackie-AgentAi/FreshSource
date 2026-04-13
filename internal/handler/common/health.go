package common

import (
	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
)

func Health(c *gin.Context) {
	response.Success(c, gin.H{
		"status": "ok",
	})
}
