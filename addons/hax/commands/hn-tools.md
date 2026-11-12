# /hn-tools — semantic tool discovery across the MCP catalog
You need a capability — search before hardcoding or improvising.
```
node addons/hax/hn.mjs tools "<natural-language need>"
node addons/hax/hn.mjs suggest
```
List the top hits (name + server + one line), then execute the best fit via:
`node addons/hax/hn.mjs call <tool-name> '{"arg":"value"}'`.
