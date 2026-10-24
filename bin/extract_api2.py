p = r"C:\Users\hyper\AppData\Roaming\npm\node_modules\@earendil-works\pi-coding-agent\dist\core\extensions\types.d.ts"
src = open(p, encoding="utf-8").read()
# Find ExtensionAPI
idx = src.find("export interface ExtensionAPI")
print("found at:", idx)
if idx >= 0:
    # print next 3000 chars
    print(src[idx:idx+3000])
