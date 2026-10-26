import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const WebSocket = require('ws');

const tabs = JSON.parse(execSync('curl -s http://127.0.0.1:9222/json').toString());
const museTab = tabs.find(t => t.url === 'https://muse.ai/');
if (!museTab) { console.log('No muse.ai tab'); process.exit(0); }

const ws = new WebSocket(museTab.webSocketDebuggerUrl);
ws.on('open', () => {
  ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {
    expression: `(() => { const msgs = document.querySelectorAll('[data-testid="chat-message"], .message, [class*="message"], [class*="chat"] > div'); const texts = []; for (let i = Math.max(0, msgs.length-6); i < msgs.length; i++) { const t = msgs[i].textContent.trim(); if (t.length > 10) texts.push(t.slice(0, 500)); } return texts.join('\\n---\\n'); })()`,
    returnByValue: true
  }}));
});
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id === 1) { console.log(msg.result?.result?.value || 'no data'); ws.close(); process.exit(0); }
});
setTimeout(() => { console.log('timeout'); process.exit(0); }, 5000);
