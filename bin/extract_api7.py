p = r"C:\Users\hyper\AppData\Roaming\npm\node_modules\@earendil-works\pi-coding-agent\dist\core\extensions\types.d.ts"
src = open(p, encoding="utf-8").read()
# Find prepareLoadout
idx = src.find("prepareLoadout")
if idx >= 0:
    print("=== prepareLoadout context ===")
    print(src[max(0,idx-200):idx+500])
else:
    print("prepareLoadout not found")
print()
# Find ResourcesDiscoverEvent / ResourcesDiscoverResult
for name in ["ResourcesDiscoverEvent", "ResourcesDiscoverResult", "ProjectTrustHandler", "McpServerConfig"]:
    idx = src.find(f"export type {name}") if f"export type {name}" in src else src.find(f"export interface {name}")
    if idx < 0:
        idx = src.find(f"{name} =")
    if idx >= 0:
        print(f"=== {name} ===")
        print(src[idx:idx+400])
        print()
    else:
        print(f"{name} not found")
        print()
