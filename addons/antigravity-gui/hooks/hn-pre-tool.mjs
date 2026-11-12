// hn-pre-tool: allow-gate for GUI harnesses (no shell execution).
// Deny native shell tool calls; route through HyperNexus parity tools.
export function gate(toolName) {
  if (/^(bash|powershell|shell)$/i.test(String(toolName || ""))) return { allow: false, reason: "shell disabled; use hypernexus parity tools (Meta 403 guard)" };
  return { allow: true };
}
