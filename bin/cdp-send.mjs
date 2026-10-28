// Type a message into muse.ai's chat input + submit it. node bin/cdp-send.mjs "<msg>|@file"
import { execSync } from "child_process";
import { readFileSync } from "node:fs";
const rawArg = process.argv.slice(2).join(" ");
const msg = rawArg.startsWith("@") ? readFileSync(rawArg.slice(1), "utf8").trim() : rawArg;
const tabs = JSON.parse(execSync("curl.exe -s -m 10 http://127.0.0.1:9222/json").toString());
const tab = tabs.find((t) => t.type === "page" && t.url.includes("muse.ai"));
if (!tab) { console.error("muse tab not found"); process.exit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
// Synchronous expression (NO setTimeout / awaitPromise): background tabs throttle
// setTimeout, which would hang the evaluate. Set value -> input -> Enter.
const js = `
(function () {
  const ta = document.querySelector('textarea');
  if (!ta) return 'NO_TEXTAREA';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, ${JSON.stringify(msg)});
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  ta.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  ta.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  return 'SUBMITTED';
})()
`;
ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: js, returnByValue: true } }));
ws.onmessage = (ev) => {
  const d = JSON.parse(ev.data);
  if (d.id === 1) { console.log("send result:", d.result?.result?.value ?? d.result?.exceptionDetails?.text); ws.close(); process.exit(0); }
};
setTimeout(() => { console.error("timeout"); process.exit(1); }, 60000);
