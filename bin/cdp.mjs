// Minimal CDP client over Node's built-in WebSocket. node bin/cdp.mjs <url> <js|@file>
import { execSync } from "child_process";
import { readFileSync } from "node:fs";
const [,, url, jsArg] = process.argv;
// @file avoids shell-quoting mangling (PowerShell turned \"1+1\" into \1+1).
const js = jsArg.startsWith("@") ? readFileSync(jsArg.slice(1), "utf8") : jsArg;
const tabs = JSON.parse(execSync("curl.exe -s -m 10 http://127.0.0.1:9222/json").toString());
const tab = tabs.find((t) => t.type === "page" && (t.url.includes("muse.ai") || t.url.includes(url)));
if (!tab) { console.error("muse tab not found"); process.exit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
ws.onopen = () => {
  ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: js, awaitPromise: true, returnByValue: true } }));
};
ws.onmessage = (ev) => {
  const d = JSON.parse(ev.data);
  if (d.id === 1) {
    const r = d.result?.result;
    const ex = d.result?.exceptionDetails;
    const exDetail = ex?.exception?.description || ex?.error?.text || ex?.text;
    console.log(r?.value !== undefined ? JSON.stringify(r.value) : (exDetail ?? r?.description ?? "no value"));
    ws.close(); process.exit(0);
  }
};
setTimeout(() => { console.error("CDP timeout"); process.exit(1); }, 30000);
