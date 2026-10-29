// Dashboard E2E step 1: load production dashboard, verify render, screenshot.
const { execSync } = require("child_process");
const fs = require("fs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const tabs = JSON.parse(execSync("curl.exe -s -m 10 http://127.0.0.1:9222/json").toString());
  // Open a fresh tab to the dashboard
  const nu = JSON.parse(execSync('curl.exe -s -m 10 -X PUT "http://127.0.0.1:9222/json/new?https://hypernexus.site/dashboard"').toString());
  console.log("TAB:", nu.id);
  const ws = new WebSocket(nu.webSocketDebuggerUrl);
  const send = (id, method, params = {}) => ws.send(JSON.stringify({ id, method, params }));
  const pending = {};
  ws.onmessage = (ev) => {
    const d = JSON.parse(ev.data);
    if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; }
  };
  const call = (method, params = {}, t = 30000) => new Promise((res, rej) => {
    const id = Math.floor(Math.random() * 1e9);
    pending[id] = res; send(id, method, params);
    setTimeout(() => { if (pending[id]) { delete pending[id]; rej(new Error("cdp-timeout:" + method)); } }, t);
  });
  await new Promise((r) => ws.on("open", r));
  await sleep(12000); // let Next.js hydrate
  const title = await call("Runtime.evaluate", { expression: "document.title", returnByValue: true });
  console.log("TITLE:", JSON.stringify(title.result?.result?.value));
  const body = await call("Runtime.evaluate", { expression: "document.body.innerText.slice(0,600)", returnByValue: true });
  console.log("BODYHEAD:", JSON.stringify(body.result?.result?.value));
  const errs = await call("Runtime.evaluate", { expression: "window.__errs||'no-hook'", returnByValue: true });
  console.log("ERRHOOK:", JSON.stringify(errs.result?.result?.value));
  const shot = await call("Page.captureScreenshot", { format: "png" }, 30000);
  fs.writeFileSync("C:/Users/hyper/workspace/HyperNexus/.tmp-dash.png", Buffer.from(shot.result.data, "base64"));
  console.log("SHOT: saved");
  ws.close(); process.exit(0);
})().catch((e) => { console.error("E2E-FAIL:", e.message); process.exit(1); });
