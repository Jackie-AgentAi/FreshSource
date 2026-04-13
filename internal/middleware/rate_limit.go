package middleware

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
)

const (
	codeRateLimited  = 10004
	limitWindowInSec = 60
)

type rateLimitEntry struct {
	WindowStart time.Time
	Count       int
}

func RateLimit(maxRequestsPerMinute int) gin.HandlerFunc {
	var (
		mu      sync.Mutex
		entries = make(map[string]rateLimitEntry)
	)
	window := time.Duration(limitWindowInSec) * time.Second

	return func(c *gin.Context) {
		clientKey := c.ClientIP() + "|" + c.FullPath()
		now := time.Now()

		mu.Lock()
		entry := entries[clientKey]
		if entry.WindowStart.IsZero() || now.Sub(entry.WindowStart) >= window {
			entry = rateLimitEntry{
				WindowStart: now,
				Count:       0,
			}
		}
		entry.Count++
		entries[clientKey] = entry
		mu.Unlock()

		if entry.Count > maxRequestsPerMinute {
			response.Fail(c, codeRateLimited, "request too frequent")
			c.Abort()
			return
		}

		c.Next()
	}
}
