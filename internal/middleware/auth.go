package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/auth"
	"freshmart/internal/pkg/response"
)

const (
	contextKeyUserID = "user_id"
	contextKeyRole   = "role"
)

const (
	codeTokenInvalid = 10002
	codeForbidden    = 10003
)

func AuthRequired(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, ok := extractBearerToken(c.GetHeader("Authorization"))
		if !ok {
			response.Fail(c, codeTokenInvalid, "token invalid or expired")
			c.Abort()
			return
		}

		claims, err := auth.ParseAccessToken(token, jwtSecret)
		if err != nil {
			response.Fail(c, codeTokenInvalid, "token invalid or expired")
			c.Abort()
			return
		}

		c.Set(contextKeyUserID, claims.UserID)
		c.Set(contextKeyRole, claims.Role)
		c.Next()
	}
}

func RequireRole(role int) gin.HandlerFunc {
	return func(c *gin.Context) {
		currentRole, ok := c.Get(contextKeyRole)
		if !ok {
			response.Fail(c, codeForbidden, "permission denied")
			c.Abort()
			return
		}

		roleValue, ok := currentRole.(int)
		if !ok || roleValue != role {
			response.Fail(c, codeForbidden, "permission denied")
			c.Abort()
			return
		}

		c.Next()
	}
}

func extractBearerToken(rawAuthorization string) (string, bool) {
	parts := strings.SplitN(strings.TrimSpace(rawAuthorization), " ", 2)
	if len(parts) != 2 {
		return "", false
	}
	if !strings.EqualFold(parts[0], "Bearer") {
		return "", false
	}
	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", false
	}
	return token, true
}

func GetAuthContext(c *gin.Context) (int64, int, bool) {
	userIDValue, userIDOk := c.Get(contextKeyUserID)
	roleValue, roleOk := c.Get(contextKeyRole)
	if !userIDOk || !roleOk {
		return 0, 0, false
	}

	userID, userIDTypeOK := userIDValue.(int64)
	role, roleTypeOK := roleValue.(int)
	if !userIDTypeOK || !roleTypeOK {
		return 0, 0, false
	}
	return userID, role, true
}

func AbortSystemError(c *gin.Context) {
	c.JSON(http.StatusOK, response.Envelope{
		Code:    10000,
		Message: "system error",
		Data:    nil,
	})
	c.Abort()
}
