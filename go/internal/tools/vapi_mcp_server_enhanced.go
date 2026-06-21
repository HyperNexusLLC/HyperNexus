        func doRequest(method, path string, body interface{}) ([]byte, error) {
            token := os.Getenv("VAPI_TOKEN")
            if token == "" {
                return nil, fmt.Errorf("VAPI_TOKEN environment variable not set")
}

            var bodyReader io.Reader
            if body != nil {
                b, e := json.Marshal(body)
                if e != nil {
                    return nil, e
                }
                bodyReader = strings.NewReader(string(b))

            req, e := http.NewRequest(method, "https://api.vapi.ai"+path, bodyReader)
            if e != nil {
                return nil, e
            }
            req.Header.Set("Authorization", "Bearer "+token)
            req.Header.Set("Content-Type", "application/json")
            resp, e := client.Do(req)
            if e != nil {
                return nil, e
            }
            defer resp.Body.Close()
            if resp.StatusCode >= 400 {
                b, _ := io.ReadAll(resp.Body)
                return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(b))
}

            return io.ReadAll(resp.Body)
}

    package tools

    import (
        "context"
        "encoding/json"
        "fmt"
        "io"
        "net/http"
        "os"
        "strings"
        "time"
    )

    const vapiBaseURL = "https://api.vapi.ai"

    var http.DefaultClient = http.DefaultClient

}

    // Helper to make authenticated requests
    func vapiRequest(method, path string, payload map[string]interface{}) ([]byte, error) {
        token := os.Getenv("VAPI_TOKEN")
        if token == "" {
            return nil, fmt.Errorf("VAPI_TOKEN environment variable is not set")
}

        var body io.Reader
        if payload != nil {
            jsonData, e := json.Marshal(payload)
            if e != nil {
                return nil, e
            }
            body = strings.NewReader(string(jsonData))

        req, e := http.NewRequest(method, vapiBaseURL+path, body)
        if e != nil {
            return nil, e
        }

        req.Header.Set("Authorization", "Bearer "+token)
        req.Header.Set("Content-Type", "application/json")

        resp, e := http.DefaultClient.Do(req)
        if e != nil {
            return nil, e
        }
        defer resp.Body.Close()

        respBody, e := io.ReadAll(resp.Body)
        if e != nil {
            return nil, e
        }

        if resp.StatusCode >= 400 {
            return nil, fmt.Errorf("Vapi API error: %s - %s", resp.Status, string(respBody))
}

        return respBody, nil
    }

}

    // Assistants
    func HandleVapiListAssistants(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        data, e := vapiRequest("GET", "/assistant", nil)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    func HandleVapiGetAssistant(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        id, _ :=getString(args, "assistantId")
        if id == "" { return err("assistantId is required") }
        data, e := vapiRequest("GET", "/assistant/"+id, nil)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    func HandleVapiCreateAssistant(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        // Remove assistantId if present in args for creation
        delete(args, "assistantId")
        data, e := vapiRequest("POST", "/assistant", args)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    func HandleVapiUpdateAssistant(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        id, _ :=getString(args, "assistantId")
        if id == "" { return err("assistantId is required") }
        delete(args, "assistantId")
        data, e := vapiRequest("PATCH", "/assistant/"+id, args)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    func HandleVapiDeleteAssistant(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        id, _ :=getString(args, "assistantId")
        if id == "" { return err("assistantId is required") }
        data, e := vapiRequest("DELETE", "/assistant/"+id, nil)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    // Calls
    func HandleVapiListCalls(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        // Vapi list calls supports query params, but for simplicity we pass nil body or construct query string
        // For now, simple GET
        data, e := vapiRequest("GET", "/call", nil)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    func HandleVapiGetCall(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        id, _ :=getString(args, "callId")
        if id == "" { return err("callId is required") }
        data, e := vapiRequest("GET", "/call/"+id, nil)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    func HandleVapiCreateCall(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        data, e := vapiRequest("POST", "/call", args)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    // Phone Numbers
    func HandleVapiListPhoneNumbers(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        data, e := vapiRequest("GET", "/phone-number", nil)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    func HandleVapiGetPhoneNumber(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        id, _ :=getString(args, "phoneNumberId")
        if id == "" { return err("phoneNumberId is required") }
        data, e := vapiRequest("GET", "/phone-number/"+id, nil)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    func HandleVapiBuyPhoneNumber(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        // Endpoint usually /phone-number/buy or similar, checking Vapi docs mentally...
        // Vapi docs say POST /phone-number with a "buy" intent or specific endpoint.
        // Actually, looking at standard Vapi SDKs, it's often POST /phone-number with a specific structure or /phone-number/search then buy.
        // Let's assume POST /phone-number for buying based on common patterns or check if there is a specific buy endpoint.
        // The README says "vapi_buy_phone_number".
        // Let's try POST /phone-number/buy or just POST /phone-number.
        // Actually, Vapi API uses POST /phone-number to buy (providing area code etc).
        data, e := vapiRequest("POST", "/phone-number", args)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
}

    func HandleVapiUpdatePhoneNumber(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
        id, _ :=getString(args, "phoneNumberId")
        if id == "" { return err("phoneNumberId is required") }
        delete(args, "phoneNumberId")
        data, e := vapiRequest("PATCH", "/phone-number/"+id, args)
        if e != nil { return err(e.Error()) }
        return ok(string(data))
    }