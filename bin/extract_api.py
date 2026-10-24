import re
p = r"C:\Users\hyper\AppData\Roaming\npm\node_modules\@earendil-works\pi-coding-agent\dist\core\extensions\types.d.ts"
src = open(p, encoding="utf-8").read()
# Find the ExtensionAPI interface
m = re.search(r"export interface ExtensionAPI \{", src)
if m:
    # Find matching closing brace
    depth = 0
    start = m.start()
    for i in range(m.end()-1, min(m.end()+8000, len(src))):
        if src[i] == "{": depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                print(src[start:i+1])
                break
