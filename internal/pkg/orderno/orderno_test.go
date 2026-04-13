package orderno

import (
	"sync"
	"testing"
	"time"
)

func TestGenerate_FormatAndLength(t *testing.T) {
	s, err := GenerateAt(time.Date(2026, 4, 14, 15, 30, 45, 0, time.Local))
	if err != nil {
		t.Fatal(err)
	}
	if len(s) != TotalLen {
		t.Fatalf("len=%d want %d: %q", len(s), TotalLen, s)
	}
	wantPrefix := Prefix + "20260414153045"
	if s[:len(wantPrefix)] != wantPrefix {
		t.Fatalf("prefix: got %q want start with %q", s, wantPrefix)
	}
	for i := len(wantPrefix); i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			t.Fatalf("suffix must be digits: %q", s)
		}
	}
}

// 并发 50 次抽样无重复（任务 P1-3-3 验收口径）。
func TestGenerate_Concurrent50Unique(t *testing.T) {
	const n = 50
	var wg sync.WaitGroup
	results := make([]string, n)
	var mu sync.Mutex
	var genErr error
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			s, err := Generate()
			mu.Lock()
			defer mu.Unlock()
			if err != nil && genErr == nil {
				genErr = err
			}
			results[idx] = s
		}(i)
	}
	wg.Wait()
	if genErr != nil {
		t.Fatal(genErr)
	}
	seen := make(map[string]struct{}, n)
	for _, s := range results {
		if _, dup := seen[s]; dup {
			t.Fatalf("duplicate order_no in 50 concurrent samples: %q", s)
		}
		seen[s] = struct{}{}
	}
	if len(seen) != n {
		t.Fatalf("want %d unique, got %d", n, len(seen))
	}
}
