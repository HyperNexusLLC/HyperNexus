p = r"C:\Users\hyper\AppData\Roaming\npm\node_modules\@earendil-works\pi-coding-agent\dist\core\extensions\types.d.ts"
src = open(p, encoding="utf-8").read()
idx = src.find("export interface ExtensionAPI")
print(src[idx+6500:idx+9500])
