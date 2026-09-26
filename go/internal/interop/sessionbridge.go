package interop

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

// sharedTRPCClient returns a singleton HTTP client with connection pooling
// tuned for concurrent upstream calls to an external tRPC control plane.
var sharedClientOnce sync.Once
var sharedClientInst *http.Client

func sharedTRPCClient() *http.Client {
	sharedClientOnce.Do(func() {
		transport := &http.Transport{
			MaxIdleConns:        20,
			MaxIdleConnsPerHost: 10,
			MaxConnsPerHost:     10,
			IdleConnTimeout:     30 * time.Second,
		}
		sharedClientInst = &http.Client{
			Timeout:   2 * time.Second,
			Transport: transport,
		}
	})
	return sharedClientInst
}

type UpstreamCallResult struct {
	BaseURL string          `json:"baseUrl"`
	Data    json.RawMessage `json:"data"`
}

// ResolveTRPCBases returns the ordered list of tRPC upstream base URLs.
// The legacy TypeScript control plane (hypernexus-core) was decommissioned at
// v1.0.0-alpha.251. The Go kernel is now the sole control plane. Upstream
// calls only happen when HYPERNEXUS_TRPC_UPSTREAM is explicitly set to an
// external tRPC service.
func ResolveTRPCBases(_ string) []string {
	configured := strings.TrimSpace(os.Getenv("HYPERNEXUS_TRPC_UPSTREAM"))
	if configured != "" {
		return []string{configured}
	}
	// No implicit upstreams — the Go kernel is the control plane.
	return nil
}

func CallTRPCProcedure(ctx context.Context, mainLockPath string, procedure string, payload any) (UpstreamCallResult, error) {
	bases := ResolveTRPCBases(mainLockPath)
	if len(bases) == 0 {
		return UpstreamCallResult{}, fmt.Errorf("no tRPC upstream configured (set HYPERNEXUS_TRPC_UPSTREAM to enable)")
	}

	var requestBody []byte
	var err error
	if payload == nil {
		requestBody = []byte("{}")
	} else {
		requestBody, err = json.Marshal(payload)
		if err != nil {
			return UpstreamCallResult{}, err
		}
	}

	var lastErr error
	client := sharedTRPCClient()

	// When HYPERNEXUS_TRPC_UPSTREAM is set (exclusive mode), skip the cache
	// and use only the configured base. This prevents tests from accidentally
	// hitting real servers via a stale cached working base.
	exclusiveMode := strings.TrimSpace(os.Getenv("HYPERNEXUS_TRPC_UPSTREAM")) != ""

	// If we have a cached working base, try it first (fast path)
	if !exclusiveMode {
		if cached := GetWorkingBase(); cached != "" {
			procPath := strings.TrimLeft(procedure, "/")
			targetBase := strings.TrimRight(cached, "/") + "/" + procPath
			result, tryErr := callTRPCOnce(ctx, client, targetBase, requestBody)
			if tryErr == nil {
				result.BaseURL = cached
				return result, nil
			}
			// Cache miss - base went stale, clear it
			SetWorkingBase("")
		}
	}

	// Race all remaining bases in parallel
	type baseResult struct {
		result UpstreamCallResult
		base   string
		err    error
	}
	ch := make(chan baseResult, len(bases))
	for _, base := range bases {
		go func(b string) {
			procPath := strings.TrimLeft(procedure, "/")
			targetBase := strings.TrimRight(b, "/") + "/" + procPath
			r, err := callTRPCOnce(ctx, client, targetBase, requestBody)
			ch <- baseResult{result: r, base: b, err: err}
		}(base)
	}

	remaining := len(bases)
	for remaining > 0 {
		br := <-ch
		remaining--
		if br.err == nil {
			if !exclusiveMode {
				SetWorkingBase(br.base)
			}
			br.result.BaseURL = br.base
			// Drain remaining
			go func() {
				for remaining > 0 {
					<-ch
					remaining--
				}
			}()
			return br.result, nil
		}
		lastErr = br.err
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("no tRPC upstream available")
	}
	return UpstreamCallResult{}, lastErr
}

// callTRPCOnce attempts a tRPC call: POST first, GET on 405.
func callTRPCOnce(ctx context.Context, client *http.Client, targetBase string, requestBody []byte) (UpstreamCallResult, error) {
	postReq, err := http.NewRequestWithContext(ctx, http.MethodPost, targetBase, bytes.NewReader(requestBody))
	if err != nil {
		return UpstreamCallResult{}, err
	}
	postReq.Header.Set("content-type", "application/json")

	resp, err := client.Do(postReq)
	if err != nil {
		return UpstreamCallResult{}, err
	}
	body, readErr := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if readErr != nil {
		return UpstreamCallResult{}, readErr
	}

	if resp.StatusCode == 405 {
		inputVal := url.QueryEscape(fmt.Sprintf(`{"0":%s}`, string(requestBody)))
		getURL := targetBase + "?batch=1&input=" + inputVal
		getReq, getErr := http.NewRequestWithContext(ctx, http.MethodGet, getURL, nil)
		if getErr != nil {
			return UpstreamCallResult{}, getErr
		}
		getReq.Header.Set("accept", "application/json")
		resp, err = client.Do(getReq)
		if err != nil {
			return UpstreamCallResult{}, err
		}
		body, readErr = io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if readErr != nil {
			return UpstreamCallResult{}, readErr
		}
	}

	if resp.StatusCode >= http.StatusBadRequest {
		return UpstreamCallResult{}, fmt.Errorf("upstream %s returned %d: %s (req: %s)", targetBase, resp.StatusCode, strings.TrimSpace(string(body)), string(requestBody))
	}

	data, extractErr := extractTRPCData(body)
	if extractErr != nil {
		return UpstreamCallResult{}, extractErr
	}
	return UpstreamCallResult{Data: data}, nil
}

func extractTRPCData(body []byte) (json.RawMessage, error) {
	var single struct {
		Result *struct {
			Data json.RawMessage `json:"data"`
		} `json:"result"`
		Error any `json:"error"`
	}
	if err := json.Unmarshal(body, &single); err == nil && single.Result != nil {
		return unwrapTRPCData(single.Result.Data), nil
	}
	var batched []struct {
		Result *struct {
			Data json.RawMessage `json:"data"`
		} `json:"result"`
		Error any `json:"error"`
	}
	if err := json.Unmarshal(body, &batched); err == nil && len(batched) > 0 && batched[0].Result != nil {
		return unwrapTRPCData(batched[0].Result.Data), nil
	}
	return nil, fmt.Errorf("unexpected tRPC response shape")
}

func unwrapTRPCData(data json.RawMessage) json.RawMessage {
	var wrapped struct {
		JSON json.RawMessage `json:"json"`
	}
	if err := json.Unmarshal(data, &wrapped); err == nil && len(wrapped.JSON) > 0 {
		return wrapped.JSON
	}
	return data
}
