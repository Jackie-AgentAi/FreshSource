package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	sellerProductCSVMaxBytes    = 4 << 20 // 4 MiB
	sellerProductCSVMaxDataRows = 500
	sellerProductImagesSep      = "|"
)

var sellerProductCSVHeader = []string{
	"id", "category_id", "name", "subtitle", "cover_image", "images", "description",
	"price", "original_price", "unit", "min_buy", "step_buy", "stock", "status",
	"origin_place", "shelf_life", "storage_method", "sort_order",
}

// SellerProductImportResult 批量导入结果（逐行提交，单行失败不影响其它行）。
type SellerProductImportResult struct {
	Created int                         `json:"created"`
	Updated int                         `json:"updated"`
	Errors  []SellerProductImportRowErr `json:"errors"`
}

// SellerProductImportRowErr 导入失败行说明。
type SellerProductImportRowErr struct {
	Line    int    `json:"line"`
	Message string `json:"message"`
}

// ExportSellerProductsCSV 导出当前店铺商品为 UTF-8 CSV（含 BOM，便于 Excel 打开）。
func (s *ProductService) ExportSellerProductsCSV(
	ctx context.Context,
	sellerUserID int64,
	status *int,
) ([]byte, string, error) {
	shopID, err := s.shopRepo.FindIDByOwnerUserID(ctx, sellerUserID)
	if err != nil {
		return nil, "", err
	}
	if shopID == 0 {
		return nil, "", ErrSellerShopNotFound
	}
	products, err := s.productRepo.ListByShopForExport(ctx, shopID, status, 5000)
	if err != nil {
		return nil, "", err
	}

	var buf bytes.Buffer
	buf.WriteString("\uFEFF")
	w := csv.NewWriter(&buf)
	if err := w.Write(sellerProductCSVHeader); err != nil {
		return nil, "", err
	}
	for _, p := range products {
		images := make([]string, 0)
		_ = json.Unmarshal([]byte(p.Images), &images)
		orig := ""
		if p.OriginalPrice != nil {
			orig = strconv.FormatFloat(*p.OriginalPrice, 'f', 2, 64)
		}
		row := []string{
			strconv.FormatUint(p.ID, 10),
			strconv.FormatUint(p.CategoryID, 10),
			p.Name,
			p.Subtitle,
			p.CoverImage,
			strings.Join(images, sellerProductImagesSep),
			p.Description,
			strconv.FormatFloat(p.Price, 'f', 2, 64),
			orig,
			p.Unit,
			strconv.FormatFloat(p.MinBuy, 'f', 2, 64),
			strconv.FormatFloat(p.StepBuy, 'f', 2, 64),
			strconv.Itoa(p.Stock),
			strconv.Itoa(p.Status),
			p.OriginPlace,
			p.ShelfLife,
			p.StorageMethod,
			strconv.Itoa(p.SortOrder),
		}
		if err := w.Write(row); err != nil {
			return nil, "", err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, "", err
	}
	name := fmt.Sprintf("products_export_%s.csv", time.Now().Format("20060102_150405"))
	return buf.Bytes(), name, nil
}

// ImportSellerProductsFromCSV 解析 CSV 并逐行创建或更新商品。id 为空或 0 时创建；否则更新本店商品。
func (s *ProductService) ImportSellerProductsFromCSV(ctx context.Context, sellerUserID int64, raw string) (*SellerProductImportResult, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, ErrProductImportEmpty
	}
	if len(raw) > sellerProductCSVMaxBytes {
		return nil, ErrProductImportTooLarge
	}
	if !utf8.ValidString(raw) {
		return nil, ErrProductImportBadHeader
	}

	r := csv.NewReader(strings.NewReader(strings.TrimPrefix(raw, "\uFEFF")))
	r.LazyQuotes = true
	r.TrimLeadingSpace = true

	header, err := r.Read()
	if err != nil {
		if errors.Is(err, io.EOF) {
			return nil, ErrProductImportEmpty
		}
		return nil, ErrProductImportBadHeader
	}
	if !sellerProductCSVHeaderMatches(header) {
		return nil, ErrProductImportBadHeader
	}

	result := &SellerProductImportResult{Errors: make([]SellerProductImportRowErr, 0)}
	dataRowCount := 0
	lineNo := 2 // 1-based file line: header is line 1
	for {
		rec, err := r.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, SellerProductImportRowErr{Line: lineNo, Message: err.Error()})
			lineNo++
			continue
		}
		m, err := csvRecordToMap(sellerProductCSVHeader, rec)
		if err != nil {
			result.Errors = append(result.Errors, SellerProductImportRowErr{Line: lineNo, Message: err.Error()})
			lineNo++
			continue
		}
		if csvRowLooksEmpty(m) {
			lineNo++
			continue
		}
		dataRowCount++
		if dataRowCount > sellerProductCSVMaxDataRows {
			return nil, ErrProductImportTooManyRows
		}

		input, perr := buildSaveProductInputFromCSVMap(m)
		if perr != nil {
			result.Errors = append(result.Errors, SellerProductImportRowErr{Line: lineNo, Message: perr.Error()})
			lineNo++
			continue
		}
		id := strings.TrimSpace(m["id"])
		if id == "" || id == "0" {
			if _, err := s.Create(ctx, sellerUserID, input); err != nil {
				result.Errors = append(result.Errors, SellerProductImportRowErr{Line: lineNo, Message: err.Error()})
			} else {
				result.Created++
			}
		} else {
			pid, err := strconv.ParseUint(id, 10, 64)
			if err != nil || pid == 0 {
				result.Errors = append(result.Errors, SellerProductImportRowErr{Line: lineNo, Message: "invalid id"})
			} else {
				if err := s.Update(ctx, sellerUserID, pid, input); err != nil {
					result.Errors = append(result.Errors, SellerProductImportRowErr{Line: lineNo, Message: err.Error()})
				} else {
					result.Updated++
				}
			}
		}
		lineNo++
	}
	return result, nil
}

func sellerProductCSVHeaderMatches(header []string) bool {
	if len(header) != len(sellerProductCSVHeader) {
		return false
	}
	for i, want := range sellerProductCSVHeader {
		if strings.ToLower(strings.TrimSpace(header[i])) != want {
			return false
		}
	}
	return true
}

func csvRecordToMap(header []string, record []string) (map[string]string, error) {
	if len(record) != len(header) {
		return nil, fmt.Errorf("expected %d columns, got %d", len(header), len(record))
	}
	m := make(map[string]string, len(header))
	for i, k := range header {
		m[k] = strings.TrimSpace(record[i])
	}
	return m, nil
}

func csvRowLooksEmpty(m map[string]string) bool {
	for _, k := range sellerProductCSVHeader {
		if strings.TrimSpace(m[k]) != "" {
			return false
		}
	}
	return true
}

func buildSaveProductInputFromCSVMap(m map[string]string) (SaveProductInput, error) {
	catStr := m["category_id"]
	categoryID, err := strconv.ParseUint(catStr, 10, 64)
	if err != nil || categoryID == 0 {
		return SaveProductInput{}, fmt.Errorf("invalid category_id")
	}
	name := strings.TrimSpace(m["name"])
	if name == "" {
		return SaveProductInput{}, fmt.Errorf("name is required")
	}
	price, err := strconv.ParseFloat(strings.TrimSpace(m["price"]), 64)
	if err != nil || price <= 0 {
		return SaveProductInput{}, fmt.Errorf("invalid price")
	}
	unit := normalizeUnit(m["unit"])
	cover := strings.TrimSpace(m["cover_image"])
	if cover == "" {
		return SaveProductInput{}, fmt.Errorf("cover_image is required")
	}

	var origPtr *float64
	if op := strings.TrimSpace(m["original_price"]); op != "" {
		v, err := strconv.ParseFloat(op, 64)
		if err != nil {
			return SaveProductInput{}, fmt.Errorf("invalid original_price")
		}
		origPtr = &v
	}

	minBuy := 0.0
	if mb := strings.TrimSpace(m["min_buy"]); mb != "" {
		minBuy, err = strconv.ParseFloat(mb, 64)
		if err != nil {
			return SaveProductInput{}, fmt.Errorf("invalid min_buy")
		}
	}
	stepBuy := 0.0
	if sb := strings.TrimSpace(m["step_buy"]); sb != "" {
		stepBuy, err = strconv.ParseFloat(sb, 64)
		if err != nil {
			return SaveProductInput{}, fmt.Errorf("invalid step_buy")
		}
	}
	stock := 0
	if st := strings.TrimSpace(m["stock"]); st != "" {
		stock, err = strconv.Atoi(st)
		if err != nil {
			return SaveProductInput{}, fmt.Errorf("invalid stock")
		}
	}
	sortOrder := 0
	if so := strings.TrimSpace(m["sort_order"]); so != "" {
		sortOrder, err = strconv.Atoi(so)
		if err != nil {
			return SaveProductInput{}, fmt.Errorf("invalid sort_order")
		}
	}

	images := parseImagesColumn(m["images"])
	if len(images) > 9 {
		return SaveProductInput{}, fmt.Errorf("images exceed 9")
	}

	return SaveProductInput{
		CategoryID:    categoryID,
		Name:          name,
		Subtitle:      m["subtitle"],
		CoverImage:    cover,
		Images:        images,
		Description:   m["description"],
		Price:         price,
		OriginalPrice: origPtr,
		Unit:          unit,
		MinBuy:        minBuy,
		StepBuy:       stepBuy,
		Stock:         stock,
		OriginPlace:   m["origin_place"],
		ShelfLife:     m["shelf_life"],
		StorageMethod: m["storage_method"],
		SortOrder:     sortOrder,
	}, nil
}

func parseImagesColumn(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, sellerProductImagesSep)
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
