//! TormentNexus extension adapter.
//!
//! Implements the [`Extension`] trait, calling TormentNexus's local API
//! (port 7778) at each lifecycle hook point. Mirrors the functionality
//! of the Pi extension at `.pi/extensions/tormentnexus.ts`.

use async_trait::async_trait;
use serde_json::{json, Value};

use crate::extension::{
    Extension, HookEvent, HookResult, McpServerDef, ShortcutDef, SlashCommandDef, ToolDef,
};

const TN_BASE: &str = "http://127.0.0.1:7778";

/// TormentNexus extension adapter.
///
/// Calls the local TN sidecar API at each lifecycle hook to:
/// - Log sessions, tool calls, and results to L2 memory
/// - Inject relevant L2 context before agent turns
/// - Auto-store interesting tool results
/// - Handle @memory:key expansions in user input
pub struct TormentNexusExtension {
    client: reqwest::Client,
}

impl TormentNexusExtension {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    async fn tn_post(&self, path: &str, body: Value) -> Result<(), String> {
        let url = format!("{TN_BASE}{path}");
        self.client
            .post(&url)
            .json(&body)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
            .map_err(|e| format!("TN request failed: {e}"))?;
        Ok(())
    }

    async fn tn_get(&self, path: &str) -> Result<Value, String> {
        let url = format!("{TN_BASE}{path}");
        let resp = self
            .client
            .get(&url)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
            .map_err(|e| format!("TN request failed: {e}"))?;
        resp.json().await.map_err(|e| format!("TN JSON parse failed: {e}"))
    }
}

#[async_trait]
impl Extension for TormentNexusExtension {
    fn name(&self) -> &str {
        "tormentnexus"
    }

    async fn on_event(&self, event: &HookEvent) -> HookResult {
        match event {
            HookEvent::SessionStart { session_id, reason } => {
                // Log session start to TN L2
                let _ = self
                    .tn_post(
                        "/api/memory/add",
                        json!({
                            "content": serde_json::to_string(&json!({
                                "content": format!("Session {reason}: {session_id}"),
                                "tags": ["system:session", format!("reason:{reason}")],
                                "category": "session",
                                "timestamp": chrono::Utc::now().to_rfc3339(),
                            })).unwrap_or_default(),
                        }),
                    )
                    .await;
                HookResult::default()
            }

            HookEvent::BeforeAgentStart { system_prompt, prompt, is_first_turn } => {
                let mut result = HookResult::default();

                if *is_first_turn {
                    // Inject full TN guidance on first turn
                    let guidance = format!(
                        "{}\n\n## TormentNexus Integration\n\n\
                        You have access to TormentNexus — a local AI control plane running on port 7778 \
                        with persistent L2 vector memory, semantic tool discovery, imported sessions, \
                        and a skill registry.\n\n\
                        ### Memory Tools\n\
                        - `mcp_tormentnexus_memory_scratchpad_get` — check L1 working memory\n\
                        - `mcp_tormentnexus_memory_scratchpad_set` — store key decisions\n\
                        - `mcp_tormentnexus_memory_scratchpad_append` — append to context\n\n\
                        ### Discovery\n\
                        - `mcp_tormentnexus_mcp_list_tools` — discover available tools\n\
                        - `mcp_tormentnexus_mcp_call_tool` — route to downstream MCP servers\n\n\
                        ### Best Practices\n\
                        1. Check scratchpad before significant work\n\
                        2. Store patterns and decisions after key moments\n\
                        3. Use repomap for codebase orientation\n\
                        4. Route complex tasks through TN sidecar",
                        system_prompt
                    );
                    result.system_prompt = Some(guidance);
                } else {
                    // Try to inject relevant L2 context on subsequent turns
                    let search_term = prompt.chars().take(100).collect::<String>();
                    if let Ok(resp) = self
                        .tn_get(&format!("/api/memory/search?q={}", urlencoding(&search_term)))
                        .await
                    {
                        if let Some(memories) = resp.get("data").and_then(|d| d.as_array()) {
                            if !memories.is_empty() {
                                let context_block = memories
                                    .iter()
                                    .take(3)
                                    .filter_map(|m| {
                                        m.get("text")
                                            .or_else(|| m.get("content"))
                                            .and_then(|v| v.as_str())
                                            .map(|s| format!("  • {}", &s[..s.len().min(200)]))
                                    })
                                    .collect::<Vec<_>>()
                                    .join("\n");
                                if !context_block.is_empty() {
                                    result.system_prompt = Some(format!(
                                        "{system_prompt}\n\n## Relevant Context from TormentNexus L2 Memory\n{context_block}"
                                    ));
                                }
                            }
                        }
                    }
                }

                result
            }

            HookEvent::ToolCall { tool_name, args, turn_id } => {
                // Log tool call to TN
                let _ = self
                    .tn_post(
                        "/api/memory/add",
                        json!({
                            "content": serde_json::to_string(&json!({
                                "content": format!("Tool call: {tool_name} in turn {turn_id}"),
                                "tags": ["system:tool_call", format!("tool:{tool_name}")],
                                "data": args,
                                "category": "tool",
                                "timestamp": chrono::Utc::now().to_rfc3339(),
                            })).unwrap_or_default(),
                        }),
                    )
                    .await;
                HookResult::default()
            }

            HookEvent::ToolResult { tool_name, args, result, is_error, turn_id } => {
                if !is_error && tool_name != "read" && tool_name != "ls" {
                    // Auto-store interesting tool results to L2
                    let result_text = serde_json::to_string(result).unwrap_or_default();
                    if result_text.len() < 2000 {
                        let _ = self
                            .tn_post(
                                "/api/memory/add",
                                json!({
                                    "content": serde_json::to_string(&json!({
                                        "content": format!("{tool_name}: {result_text:.200}"),
                                        "tags": ["system:tool_result", format!("tool:{tool_name}")],
                                        "data": args,
                                        "result": result,
                                        "category": "tool_result",
                                        "timestamp": chrono::Utc::now().to_rfc3339(),
                                    })).unwrap_or_default(),
                                }),
                            )
                            .await;
                    }
                }
                HookResult::default()
            }

            HookEvent::TurnEnd { turn_id, message_count, tool_count } => {
                // Log turn end to TN
                let _ = self
                    .tn_post(
                        "/api/memory/add",
                        json!({
                            "content": serde_json::to_string(&json!({
                                "content": format!("Turn {turn_id}: {message_count} messages, {tool_count} tools"),
                                "tags": ["system:turn_end", format!("turn:{turn_id}")],
                                "category": "turn",
                                "timestamp": chrono::Utc::now().to_rfc3339(),
                            })).unwrap_or_default(),
                        }),
                    )
                    .await;
                HookResult::default()
            }

            HookEvent::Input { text } => {
                // Handle @memory:key expansion
                if text.contains("@memory:") {
                    let memory_key = text
                        .split("@memory:")
                        .nth(1)
                        .and_then(|s| s.split_whitespace().next())
                        .unwrap_or("");
                    if !memory_key.is_empty() {
                        if let Ok(resp) = self
                            .tn_get(&format!("/api/memory/search?q={}", urlencoding(memory_key)))
                            .await
                        {
                            if let Some(memories) = resp.get("data").and_then(|d| d.as_array()) {
                                if let Some(first) = memories.first() {
                                    let value = first
                                        .get("text")
                                        .or_else(|| first.get("content"))
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("<memory not found>");
                                    let expanded = text.replace(
                                        &format!("@memory:{memory_key}"),
                                        value,
                                    );
                                    if expanded != *text {
                                        return HookResult {
                                            prompt: Some(expanded),
                                            ..Default::default()
                                        };
                                    }
                                }
                            }
                        }
                    }
                }
                HookResult::default()
            }

            HookEvent::UserBash { command } => {
                // Audit log shell commands
                let _ = self
                    .tn_post(
                        "/api/memory/add",
                        json!({
                            "content": serde_json::to_string(&json!({
                                "content": format!("bash: {command}"),
                                "tags": ["system:bash"],
                                "category": "bash",
                                "timestamp": chrono::Utc::now().to_rfc3339(),
                            })).unwrap_or_default(),
                        }),
                    )
                    .await;
                HookResult::default()
            }

            HookEvent::ModelSelect { model, provider } => {
                // Track model selection
                let _ = self
                    .tn_post(
                        "/api/memory/add",
                        json!({
                            "content": serde_json::to_string(&json!({
                                "content": format!("Model: {model} ({provider})"),
                                "tags": ["system:model_select", format!("model:{model}")],
                                "category": "model",
                                "timestamp": chrono::Utc::now().to_rfc3339(),
                            })).unwrap_or_default(),
                        }),
                    )
                    .await;
                HookResult::default()
            }

            HookEvent::SessionBeforeCompact { session_id, entry_count } => {
                let _ = self
                    .tn_post(
                        "/api/memory/add",
                        json!({
                            "content": serde_json::to_string(&json!({
                                "content": format!("Compacting session {session_id} ({entry_count} entries)"),
                                "tags": ["system:compact", format!("session:{session_id}")],
                                "category": "compaction",
                                "timestamp": chrono::Utc::now().to_rfc3339(),
                            })).unwrap_or_default(),
                        }),
                    )
                    .await;
                HookResult::default()
            }

            HookEvent::SessionShutdown { session_id } => {
                let _ = self
                    .tn_post(
                        "/api/memory/add",
                        json!({
                            "content": serde_json::to_string(&json!({
                                "content": format!("Session ended: {session_id}"),
                                "tags": ["system:session_end", format!("session:{session_id}")],
                                "category": "session",
                                "timestamp": chrono::Utc::now().to_rfc3339(),
                            })).unwrap_or_default(),
                        }),
                    )
                    .await;
                HookResult::default()
            }
        }
    }

    fn mcp_servers(&self) -> Vec<(String, McpServerDef)> {
        vec![(
            "tormentnexus".into(),
            McpServerDef {
                command: r#"C:\Users\hyper\workspace\tormentnexus\tormentnexus.exe"#.into(),
                args: vec!["mcp".into()],
                env: vec![(
                    "TORMENTNEXUS_WORKSPACE_ROOT".into(),
                    r#"C:\Users\hyper\workspace\tormentnexus"#.into(),
                )],
            },
        )]
    }

    fn slash_commands(&self) -> Vec<SlashCommandDef> {
        vec![
            SlashCommandDef {
                name: "tn-store".into(),
                description: "Store a memory in TormentNexus L2".into(),
                handler: "mcp_tormentnexus_memory_scratchpad_set".into(),
            },
            SlashCommandDef {
                name: "tn-search".into(),
                description: "Search TormentNexus L2 memory".into(),
                handler: "mcp_tormentnexus_memory_scratchpad_get".into(),
            },
            SlashCommandDef {
                name: "tn-status".into(),
                description: "Show TormentNexus system status".into(),
                handler: "mcp_tormentnexus_system_status".into(),
            },
            SlashCommandDef {
                name: "tn-summary".into(),
                description: "Summarize current session using TN context".into(),
                handler: "mcp_tormentnexus_mcp_call_tool".into(),
            },
        ]
    }

    fn shortcuts(&self) -> Vec<ShortcutDef> {
        vec![
            ShortcutDef {
                keys: "ctrl+shift+m".into(),
                description: "Open TormentNexus memory store".into(),
                action: "/tn-store".into(),
            },
            ShortcutDef {
                keys: "ctrl+shift+t".into(),
                description: "Open TormentNexus tool search".into(),
                action: "/tn-search".into(),
            },
        ]
    }

    fn tools(&self) -> Vec<ToolDef> {
        vec![
            ToolDef {
                name: "tn_memory_scratchpad".into(),
                description: "L1 working memory — get, set, or append context".into(),
                parameters: Some(serde_json::json!({
                    "type": "object",
                    "properties": {
                        "action": {"type": "string", "enum": ["get", "set", "append"]},
                        "value": {"type": "string"}
                    },
                    "required": ["action"]
                })),
            },
        ]
    }
}

fn urlencoding(s: &str) -> String {
    urlencoding_internal(s)
}

fn urlencoding_internal(s: &str) -> String {
    let mut result = String::new();
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(byte as char);
            }
            b' ' => result.push_str("%20"),
            _ => {
                result.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_urlencoding() {
        assert_eq!(urlencoding("hello world"), "hello%20world");
        assert_eq!(urlencoding("test/key"), "test%2Fkey");
        assert_eq!(urlencoding("abc123"), "abc123");
    }
}
