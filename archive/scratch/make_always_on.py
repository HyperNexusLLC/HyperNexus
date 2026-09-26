import json
import re

def main():
    filepath = "mcp.jsonc"
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    pattern = r'("(?:\\.|[^"\\])*")|//.*|/\*.*?\*/'
    cleaned = re.sub(pattern, lambda m: m.group(1) or '', content, flags=re.DOTALL)
    cleaned = re.sub(r",\s*(?=[\]}])", "", cleaned)
    
    try:
        data = json.loads(cleaned, strict=False)
    except Exception as e:
        print("Failed to parse mcp.jsonc as JSON:", e)
        return
        
    mcp_servers = data.get("mcpServers", {})
    for server_name, server_config in mcp_servers.items():
        if isinstance(server_config, dict):
            server_config["alwaysOn"] = True
            
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    print("Successfully updated all servers in mcp.jsonc to alwaysOn: true")

if __name__ == "__main__":
    main()
