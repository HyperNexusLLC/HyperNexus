package providers

import "strings"

// modelPrice is USD per 1k tokens.
type modelPrice struct {
	InputPer1k  float64
	OutputPer1k float64
}

// Static per-1k-token prices for common models (USD). Approximate public list
// prices; used for local cost estimates when billing upstream is unavailable.
var modelPrices = map[string]modelPrice{
	// OpenAI
	"gpt-4o":          {InputPer1k: 0.0025, OutputPer1k: 0.01},
	"gpt-4o-mini":     {InputPer1k: 0.00015, OutputPer1k: 0.0006},
	"gpt-4.1":         {InputPer1k: 0.002, OutputPer1k: 0.008},
	"gpt-4.1-mini":    {InputPer1k: 0.0004, OutputPer1k: 0.0016},
	"gpt-4.1-nano":    {InputPer1k: 0.0001, OutputPer1k: 0.0004},
	"o3":              {InputPer1k: 0.01, OutputPer1k: 0.04},
	"o4-mini":         {InputPer1k: 0.0011, OutputPer1k: 0.0044},
	// Anthropic
	"claude-3-7-sonnet-20250219": {InputPer1k: 0.003, OutputPer1k: 0.015},
	"claude-3-5-sonnet-20241022": {InputPer1k: 0.003, OutputPer1k: 0.015},
	"claude-3-5-haiku-20241022":  {InputPer1k: 0.0008, OutputPer1k: 0.004},
	"claude-3-opus-20240229":     {InputPer1k: 0.015, OutputPer1k: 0.075},
	// Google
	"gemini-2.5-flash": {InputPer1k: 0.00015, OutputPer1k: 0.0006},
	"gemini-2.5-pro":   {InputPer1k: 0.00125, OutputPer1k: 0.01},
	"gemini-2.0-flash": {InputPer1k: 0.0001, OutputPer1k: 0.0004},
	// DeepSeek
	"deepseek-chat":     {InputPer1k: 0.00027, OutputPer1k: 0.0011},
	"deepseek-reasoner": {InputPer1k: 0.00055, OutputPer1k: 0.00219},
	// xAI
	"grok-3":     {InputPer1k: 0.003, OutputPer1k: 0.015},
	"grok-3-mini": {InputPer1k: 0.0003, OutputPer1k: 0.0005},
}

// EstimateCostUSD returns an approximate USD cost for a model call.
// Unpriced models contribute 0 so dashboards can still show request counts.
func EstimateCostUSD(model string, inputTokens, outputTokens int) float64 {
	price, ok := lookupModelPrice(model)
	if !ok {
		return 0
	}
	return float64(inputTokens)/1000.0*price.InputPer1k +
		float64(outputTokens)/1000.0*price.OutputPer1k
}

// ModelPricePer1k returns (input, output) USD per 1k tokens when known.
func ModelPricePer1k(model string) (float64, float64, bool) {
	price, ok := lookupModelPrice(model)
	if !ok {
		return 0, 0, false
	}
	return price.InputPer1k, price.OutputPer1k, true
}

func lookupModelPrice(model string) (modelPrice, bool) {
	key := strings.ToLower(strings.TrimSpace(model))
	if key == "" {
		return modelPrice{}, false
	}
	if price, ok := modelPrices[key]; ok {
		return price, true
	}
	// Prefix match for dated snapshot names (claude-3-7-sonnet-20250219).
	for name, price := range modelPrices {
		if strings.HasPrefix(key, name) || strings.HasPrefix(name, key) {
			return price, true
		}
	}
	return modelPrice{}, false
}
