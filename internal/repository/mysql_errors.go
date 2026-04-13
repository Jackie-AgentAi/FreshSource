package repository

import (
	"errors"

	"github.com/go-sql-driver/mysql"
)

// IsMySQLDuplicateKey 判断是否为 MySQL 唯一键冲突（1062），用于订单号 uk_order_no 重试。
func IsMySQLDuplicateKey(err error) bool {
	var me *mysql.MySQLError
	return errors.As(err, &me) && me.Number == 1062
}
