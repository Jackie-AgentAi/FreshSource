// Package orderno 生成 FreshMart 订单号：FM + 14 位本地时间（yyyyMMddHHmmss）+ 6 位十进制随机数。
// 与 docs/task-list.md P1-3-3、docs/api-design 约定一致。
package orderno

import (
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"time"
)

const (
	// Prefix 订单号前缀。
	Prefix = "FM"
	// TimeLayout 14 位时间，与任务「14 位时间」一致。
	TimeLayout = "20060102150405"
	// RandomMod 6 位随机数模，取值 0～999999。
	RandomMod = 1000000
)

// TotalLen 订单号总长度：2 + 14 + 6 = 22。
const TotalLen = len(Prefix) + len("20060102150405") + 6

// Generate 使用当前本地时间生成订单号；随机数来自 crypto/rand。
func Generate() (string, error) {
	return GenerateAt(time.Now())
}

// GenerateAt 便于测试注入固定时间（同一秒内仍依赖随机段区分）。
func GenerateAt(t time.Time) (string, error) {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	n := binary.BigEndian.Uint32(b[:4]) % RandomMod
	return fmt.Sprintf("%s%s%06d", Prefix, t.Format(TimeLayout), n), nil
}
