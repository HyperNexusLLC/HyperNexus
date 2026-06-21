	resp, e := client.Get(urlStr)
	if e != nil {
		return err(fmt.Sprintf("failed to fetch URL: %v", e))
}

	defer resp.Body.Close()
	resp, e := client.Get(urlStr)
	if e != nil {
		return err(fmt.Sprintf("failed to fetch URL: %v", e))
}

	defer resp.Body.Close()
	resp, e := client.Get(urlStr)
	if e != nil {
		return err(fmt.Sprintf("failed to fetch URL: %v", e))
}

	defer resp.Body.Close()
	client := http.DefaultClient
	resp, e := client.Get(urlStr)
	if e != nil {
		return err(fmt.Sprintf("failed to fetch URL: %v", e))
}

	defer resp.Body.Close()
	var data interface{}
	if e := json.Unmarshal([]byte(jsonStr), &data); e != nil {
		return err(fmt.Sprintf("invalid JSON string: %v", e))
}

	var data interface{}
	if e := json.Unmarshal([]byte(jsonStr), &data); e != nil {
		return err(fmt.Sprintf("invalid JSON string: %v", e))
}

func findKey(data interface{}, key string) (interface{}, bool) {
	switch v := data.(type) {
	case map[string]interface{}:
		// Check direct key
		if val, found := v[key]; found {
			return val, true
		}
		// Recurse into values
		for _, val := range v {
			if res, found := findKey(val, key); found {
				return res, true
			}
		}
	case []interface{}:
		// Recurse into array elements
		for _, item := range v {
			if res, found := findKey(item, key); found {
				return res, true
			}
		}
	}
	return nil, false
}