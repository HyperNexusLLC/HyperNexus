// Type a message into muse.ai's chat input + submit it. node bin/cdp-send.mjs "<msg>"
import { execSync } from "child_process";
const msg = process.argv.slice(2).join(" ");
const tabs = JSON.parse(execSync("curl.exe -s -m 10 http://127.0.0.1:9222/json").toString());
// Prefer real chat pages over stray muse.ai subframes (e.g. tracking pixels),
// which have no textarea and can hang the evaluate.
const candidates = tabs.filter((t) => t.type === "page" && t.url.includes("muse.ai") && !t.url.includes("/api/"));
if (!candidates.length) { console.error("muse tab not found"); process.exit(1); }

async function tryTab(tab) {
  return new Promise((resolve) => {
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    const js = `
(async () => {
  const ta = document.querySelector('textarea');
  if (!ta) return 'NO_TEXTAREA';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, ${JSON.stringify(msg)});
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  // submit: Enter key on the textarea
  ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  ta.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  ta.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  return 'SUBMITTED';
})()
`;
    const timer = setTimeout(() => { try { ws.close(); } catch {} resolve("timeout"); }, 20000);
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: js, awaitPromise: true, returnByValue: true } }));
    ws.onmessage = (ev) => {
      const d = JSON.parse(ev.data);
      if (d.id === 1) {
        clearTimeout(timer);
        const v = d.result?.result?.value ?? d.result?.exceptionDetails?.text ?? "no value";
        try { ws.close(); } catch {}
        resolve(String(v));
      }
    };
    ws.onerror = () => { clearTimeout(timer); resolve("ws error"); };
  });
}

for (const tab of candidates) {
  const result = await tryTab(tab);
  console.log(`send result [${tab.url.slice(0, 50)}]: ${result}`);
  if (result === "SUBMITTED" || result === "NO_TEXTAREA") {
    if (result === "SUBMITTED") process.exit(0);
  }
}
process.exit(1);
