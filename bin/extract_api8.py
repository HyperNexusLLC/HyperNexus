p = r"C:\Users\hyper\AppData\Roaming\npm\node_modules\@earendil-works\pi-coding-agent\dist\core\extensions\types.d.ts"
src = open(p, encoding="utf-8").read()
# Find ToolDefinition
idx = src.find("export interface ToolDefinition")
if idx >= 0:
    print(src[idx:idx+2500])
else:
    # try type
    idx = src.find("ToolDefinition<")
    if idx >= 0:
        print(src[max(0,idx-200):idx+2000])
