pub mod extension;
pub mod tn_extension;
pub mod integration;

//! # Foundation Pi — TormentNexus Pi Foundation port for CodeWhale
//!
//! Port of the TormentNexus Go `foundation/pi` package: an agent harness with
//! exact tool contracts, session persistence with branching, runtime event
//! emission, and a configurable foundation spec.
//!
//! ## Concepts
//!
//! - **FoundationSpec** — top-level configuration: agent settings, session
//!   config, tool contracts, run-event sequence.
//! - **Runtime** — tool execution engine. Accepts tool calls, dispatches to
//!   registered handlers, emits ordered run events (agent_start, turn_start,
//!   message_start, …, agent_end), and persists tool runs to the session store.
//! - **SessionStore** — JSONL-based session persistence with branching (fork).
//!   Each session is a JSONL file. Metadata + entries are appended as newline-
//!   delimited JSON records.
//! - **Tool contracts** — exact name+parameter-schema definitions for:
//!   `read`, `write`, `edit`, `bash`, `grep`, `find`, `ls`.
//!
//! ## Integration with CodeWhale
//!
//! This crate is designed to be used by CodeWhale's agent runtime as a
//! foundation layer. Call `Runtime::execute_tool()` with a tool name and
//! JSON input to dispatch tool execution through the Pi harness.
//!
//! ```no_run
//! use codewhale_foundation_pi::*;
//!
//! let rt = Runtime::new("/tmp", None);
//! let input = serde_json::json!({"path": "hello.txt", "content": "pi"});
//! let result = rt.execute_tool("session-1", "write", &input, None);
//! ```

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

// ── Thinking / Steering / Transport / Execution Modes ──

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ThinkingLevel {
    Off,
    Minimal,
    Low,
    Medium,
    High,
    XHigh,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum MessageDeliveryMode {
    OneAtATime,
    All,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TransportPreference {
    Auto,
    Sse,
    WebSocket,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ToolExecutionMode {
    Parallel,
    Sequential,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RunEventType {
    AgentStart,
    TurnStart,
    MessageStart,
    MessageUpdate,
    MessageEnd,
    ToolExecutionStart,
    ToolExecutionUpdate,
    ToolExecutionEnd,
    TurnEnd,
    AgentEnd,
}

// ── Run Event ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunEvent {
    #[serde(rename = "type")]
    pub event_type: RunEventType,
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Box<ToolResult>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ── Tool Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextContent {
    #[serde(rename = "type")]
    pub content_type: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageContent {
    #[serde(rename = "type")]
    pub content_type: String,
    pub data: String,
    pub mime_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ContentBlock {
    Text(TextContent),
    Image(ImageContent),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TruncationDetails {
    pub truncated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub truncated_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_lines: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_lines: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_bytes: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_lines: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_bytes: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_line_exceeds: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_line_partial: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub continuation_offset: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full_output_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_name: String,
    pub content: Vec<ContentBlock>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
    #[serde(default)]
    pub is_error: bool,
}

// ── Tool Inputs ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadToolInput {
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WriteToolInput {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditReplacement {
    pub old_text: String,
    pub new_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditToolInput {
    pub path: String,
    pub edits: Vec<EditReplacement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BashToolInput {
    pub command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrepToolInput {
    pub pattern: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub glob: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ignore_case: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub literal: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindToolInput {
    pub pattern: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LsToolInput {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,
}

// ── Tool Contract / Descriptor ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDescriptor {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<Value>,
}

/// Returns the canonical Pi built-in tool descriptors with exact parameter schemas.
pub fn builtin_tools() -> Vec<ToolDescriptor> {
    vec![
        ToolDescriptor {
            name: "read".into(),
            description: Some("Read file contents by path with optional line offsets.".into()),
            parameters: Some(serde_json::json!({
                "type": "object",
                "required": ["path"],
                "properties": {
                    "path": {"type": "string"},
                    "offset": {"type": "integer", "minimum": 1},
                    "limit": {"type": "integer", "minimum": 1}
                },
                "additionalProperties": false
            })),
        },
        ToolDescriptor {
            name: "write".into(),
            description: Some("Create or overwrite a file with content.".into()),
            parameters: Some(serde_json::json!({
                "type": "object",
                "required": ["path", "content"],
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"}
                },
                "additionalProperties": false
            })),
        },
        ToolDescriptor {
            name: "edit".into(),
            description: Some("Apply exact text replacements to a file.".into()),
            parameters: Some(serde_json::json!({
                "type": "object",
                "required": ["path", "edits"],
                "properties": {
                    "path": {"type": "string"},
                    "edits": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["oldText", "newText"],
                            "properties": {
                                "oldText": {"type": "string"},
                                "newText": {"type": "string"}
                            },
                            "additionalProperties": false
                        },
                        "minItems": 1
                    }
                },
                "additionalProperties": false
            })),
        },
        ToolDescriptor {
            name: "bash".into(),
            description: Some("Execute a shell command with optional timeout seconds.".into()),
            parameters: Some(serde_json::json!({
                "type": "object",
                "required": ["command"],
                "properties": {
                    "command": {"type": "string"},
                    "timeout": {"type": "number", "exclusiveMinimum": 0}
                },
                "additionalProperties": false
            })),
        },
        ToolDescriptor {
            name: "grep".into(),
            description: Some(
                "Search file contents for a pattern. Returns matching lines with file paths and line numbers. Respects .gitignore.".into(),
            ),
            parameters: Some(serde_json::json!({
                "type": "object",
                "required": ["pattern"],
                "properties": {
                    "pattern": {"type": "string"},
                    "path": {"type": "string"},
                    "glob": {"type": "string"},
                    "ignoreCase": {"type": "boolean"},
                    "literal": {"type": "boolean"},
                    "context": {"type": "integer", "minimum": 0},
                    "limit": {"type": "integer", "minimum": 1}
                },
                "additionalProperties": false
            })),
        },
        ToolDescriptor {
            name: "find".into(),
            description: Some(
                "Search for files by glob pattern. Returns matching file paths relative to the search directory.".into(),
            ),
            parameters: Some(serde_json::json!({
                "type": "object",
                "required": ["pattern"],
                "properties": {
                    "pattern": {"type": "string"},
                    "path": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1}
                },
                "additionalProperties": false
            })),
        },
        ToolDescriptor {
            name: "ls".into(),
            description: Some(
                "List directory contents. Returns entries sorted alphabetically, with '/' suffix for directories.".into(),
            ),
            parameters: Some(serde_json::json!({
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1}
                },
                "additionalProperties": false
            })),
        },
    ]
}

// ── Agent / Session / Foundation Spec ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThinkingBudgets {
    pub minimal: i64,
    pub low: i64,
    pub medium: i64,
    pub high: i64,
    pub xhigh: i64,
}

impl Default for ThinkingBudgets {
    fn default() -> Self {
        Self { minimal: 128, low: 512, medium: 1024, high: 2048, xhigh: 4096 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentState {
    pub system_prompt: String,
    pub model: String,
    pub thinking_level: ThinkingLevel,
    pub tools: Vec<ToolDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub initial_state: AgentState,
    pub steering_mode: MessageDeliveryMode,
    pub follow_up_mode: MessageDeliveryMode,
    pub transport: TransportPreference,
    pub tool_execution: ToolExecutionMode,
    pub thinking_budgets: ThinkingBudgets,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionConfig {
    pub auto_save: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ephemeral: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub directory: Option<String>,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self { auto_save: true, ephemeral: Some(false), directory: None }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FoundationSpec {
    pub name: String,
    pub philosophy: String,
    pub agent: AgentConfig,
    pub session: SessionConfig,
    pub run_event_sequence: Vec<RunEventType>,
    pub features: Vec<String>,
}

/// Returns the default Pi foundation spec.
pub fn default_foundation_spec() -> FoundationSpec {
    FoundationSpec {
        name: "pi-go-foundation".into(),
        philosophy: "Minimal terminal coding harness with exact model-facing tool contracts, strong extension seams, and native integration points for TormentNexus and CodeWhale.".into(),
        agent: AgentConfig {
            initial_state: AgentState {
                system_prompt: "You are a helpful coding agent.".into(),
                model: "provider/model".into(),
                thinking_level: ThinkingLevel::Minimal,
                tools: builtin_tools(),
            },
            steering_mode: MessageDeliveryMode::OneAtATime,
            follow_up_mode: MessageDeliveryMode::OneAtATime,
            transport: TransportPreference::Auto,
            tool_execution: ToolExecutionMode::Parallel,
            thinking_budgets: ThinkingBudgets::default(),
        },
        session: SessionConfig::default(),
        run_event_sequence: vec![
            RunEventType::AgentStart,
            RunEventType::TurnStart,
            RunEventType::MessageStart,
            RunEventType::MessageUpdate,
            RunEventType::MessageEnd,
            RunEventType::ToolExecutionStart,
            RunEventType::ToolExecutionUpdate,
            RunEventType::ToolExecutionEnd,
            RunEventType::TurnEnd,
            RunEventType::AgentEnd,
        ],
        features: vec![
            "interactive mode".into(),
            "print/json mode".into(),
            "rpc/daemon mode".into(),
            "session branching".into(),
            "session compaction".into(),
            "extensions".into(),
            "skills".into(),
            "prompt templates".into(),
            "themes".into(),
            "exact tool contracts".into(),
        ],
    }
}

// ── Session Store ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetadata {
    pub session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub working_dir: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionEntry {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_input: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Box<ToolResult>>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionFile {
    pub metadata: SessionMetadata,
    pub entries: Vec<SessionEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SessionRecord {
    #[serde(rename = "type")]
    record_type: String,
    data: Value,
}

/// JSONL-based session store with branching support.
///
/// Each session is a JSONL file at `{base_dir}/{session_id}.jsonl`.
/// Records are append-only: one JSON line per metadata write or entry.
#[derive(Debug)]
pub struct SessionStore {
    base_dir: PathBuf,
}

impl SessionStore {
    pub fn new(base_dir: impl Into<PathBuf>) -> Self {
        Self { base_dir: base_dir.into() }
    }

    pub fn default_in(cwd: impl Into<PathBuf>) -> Self {
        Self::new(PathBuf::from(cwd.into()).join(".codewhale").join("foundation").join("sessions"))
    }

    pub fn base_dir(&self) -> &Path {
        &self.base_dir
    }

    fn path(&self, session_id: &str) -> PathBuf {
        self.base_dir.join(format!("{session_id}.jsonl"))
    }

    pub fn create(&self, name: Option<&str>, working_dir: &str) -> std::io::Result<SessionFile> {
        std::fs::create_dir_all(&self.base_dir)?;
        let now = Utc::now().timestamp_millis();
        let session = SessionFile {
            metadata: SessionMetadata {
                session_id: Uuid::new_v4().to_string(),
                name: name.map(String::from),
                working_dir: working_dir.to_string(),
                created_at: now,
                updated_at: now,
            },
            entries: vec![],
        };
        self.save(&session)?;
        Ok(session)
    }

    pub fn save(&self, session: &SessionFile) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.base_dir)?;
        let path = self.path(&session.metadata.session_id);
        let file = std::fs::File::create(&path)?;
        let writer = std::io::BufWriter::new(file);

        let meta_record = SessionRecord {
            record_type: "session".into(),
            data: serde_json::to_value(&session.metadata).unwrap_or_default(),
        };
        let mut line = serde_json::to_vec(&meta_record).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::Other, e)
        })?;
        line.push(b'\n');

        use std::io::Write;
        let mut buf_writer = writer;
        buf_writer.write_all(&line)?;

        for entry in &session.entries {
            let entry_record = SessionRecord {
                record_type: "entry".into(),
                data: serde_json::to_value(entry).unwrap_or_default(),
            };
            let mut line = serde_json::to_vec(&entry_record).map_err(|e| {
                std::io::Error::new(std::io::ErrorKind::Other, e)
            })?;
            line.push(b'\n');
            buf_writer.write_all(&line)?;
        }

        buf_writer.flush()?;
        Ok(())
    }

    pub fn load(&self, session_id: &str) -> std::io::Result<SessionFile> {
        let path = self.path(session_id);
        let content = std::fs::read_to_string(&path)?;

        let mut session = SessionFile {
            metadata: SessionMetadata {
                session_id: session_id.to_string(),
                name: None,
                working_dir: String::new(),
                created_at: 0,
                updated_at: 0,
            },
            entries: vec![],
        };

        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }
            let record: SessionRecord = serde_json::from_str(line).map_err(|e| {
                std::io::Error::new(std::io::ErrorKind::InvalidData, e)
            })?;
            match record.record_type.as_str() {
                "session" => {
                    let meta: SessionMetadata = serde_json::from_value(record.data).map_err(|e| {
                        std::io::Error::new(std::io::ErrorKind::InvalidData, e)
                    })?;
                    session.metadata = meta;
                }
                "entry" => {
                    let entry: SessionEntry = serde_json::from_value(record.data).map_err(|e| {
                        std::io::Error::new(std::io::ErrorKind::InvalidData, e)
                    })?;
                    session.entries.push(entry);
                }
                _ => {}
            }
        }

        Ok(session)
    }

    pub fn append_entry(&self, session_id: &str, entry: SessionEntry) -> std::io::Result<SessionFile> {
        let mut session = self.load(session_id)?;
        let mut entry = entry;
        if entry.id.is_empty() {
            entry.id = Uuid::new_v4().to_string();
        }
        if entry.created_at == 0 {
            entry.created_at = Utc::now().timestamp_millis();
        }
        session.entries.push(entry);
        self.save(&session)?;
        Ok(session)
    }

    pub fn fork(&self, session_id: &str, from_entry_id: Option<&str>, name: Option<&str>) -> std::io::Result<SessionFile> {
        let session = self.load(session_id)?;
        let mut forked = self.create(name, &session.metadata.working_dir)?;
        let stop_id = from_entry_id.or_else(|| session.entries.last().map(|e| e.id.as_str()));
        for entry in &session.entries {
            forked.entries.push(entry.clone());
            if stop_id == Some(&entry.id) {
                break;
            }
        }
        self.save(&forked)?;
        Ok(forked)
    }

    pub fn list(&self) -> std::io::Result<Vec<SessionMetadata>> {
        if !self.base_dir.exists() {
            return Ok(vec![]);
        }
        let mut sessions = Vec::new();
        for entry in std::fs::read_dir(&self.base_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) != Some("jsonl") {
                continue;
            }
            if let Ok(session) = self.load(
                path.file_stem().and_then(|s| s.to_str()).unwrap_or(""),
            ) {
                sessions.push(session.metadata);
            }
        }
        Ok(sessions)
    }
}

// ── Runtime ──

pub type EventSink = Box<dyn Fn(RunEvent) + Send + Sync>;
pub type ToolHandler = Box<dyn Fn(&str, Value) -> Result<ToolResult, String> + Send + Sync>;

/// The Pi Runtime — dispatches tool calls, emits ordered events, persists to session store.
pub struct Runtime {
    cwd: PathBuf,
    handlers: Mutex<HashMap<String, ToolHandler>>,
    session_store: SessionStore,
}

impl Runtime {
    pub fn new(cwd: impl Into<PathBuf>, store: Option<SessionStore>) -> Self {
        let store = store.unwrap_or_else(|| SessionStore::default_in(cwd.as_ref()));
        Self {
            cwd: cwd.into(),
            handlers: Mutex::new(HashMap::new()),
            session_store: store,
        }
    }

    pub fn session_store(&self) -> &SessionStore {
        &self.session_store
    }

    /// Register a custom tool handler.
    pub fn register_tool(&self, name: &str, handler: ToolHandler) {
        let mut handlers = self.handlers.lock().unwrap();
        handlers.insert(name.to_string(), handler);
    }

    /// Execute a tool by name with JSON input.
    ///
    /// Returns `(ToolResult, Vec<RunEvent>)` — the result and the ordered event sequence.
    pub fn execute_tool(
        &self,
        session_id: Option<&str>,
        tool_name: &str,
        input: &Value,
        custom_sink: Option<EventSink>,
    ) -> (Result<ToolResult, String>, Vec<RunEvent>) {
        let now = || Utc::now().timestamp_millis();
        let mut events = Vec::new();

        let mut emit = |event_type: RunEventType, result: Option<ToolResult>, error: Option<String>| {
            let event = RunEvent {
                event_type,
                timestamp: now(),
                session_id: session_id.map(String::from),
                tool_name: Some(tool_name.to_string()),
                input: Some(input.clone()),
                result: result.map(Box::new),
                error,
            };
            events.push(event.clone());
            if let Some(ref sink) = custom_sink {
                sink(event);
            }
        };

        emit(RunEventType::AgentStart, None, None);
        emit(RunEventType::TurnStart, None, None);
        emit(RunEventType::MessageStart, None, None);
        emit(RunEventType::MessageEnd, None, None);
        emit(RunEventType::ToolExecutionStart, None, None);

        let handlers = self.handlers.lock().unwrap();
        let result = if let Some(handler) = handlers.get(tool_name) {
            let cwd_str = self.cwd.to_string_lossy().to_string();
            handler(&cwd_str, input.clone())
        } else {
            Err(format!("unknown tool: {tool_name}"))
        };

        match result {
            Ok(tool_result) => {
                let result_clone = tool_result.clone();
                emit(RunEventType::ToolExecutionEnd, Some(tool_result), None);
                emit(RunEventType::TurnEnd, Some(result_clone.clone()), None);
                emit(RunEventType::AgentEnd, Some(result_clone.clone()), None);

                // Persist to session store
                if let Some(sid) = session_id {
                    let entry = SessionEntry {
                        id: Uuid::new_v4().to_string(),
                        parent_id: None,
                        kind: "tool_call".into(),
                        role: None,
                        text: None,
                        tool_name: Some(tool_name.to_string()),
                        tool_input: Some(input.clone()),
                        result: Some(Box::new(result_clone)),
                        created_at: now(),
                    };
                    let _ = self.session_store.append_entry(sid, entry);
                }

                (Ok(tool_result), events)
            }
            Err(err) => {
                emit(RunEventType::AgentEnd, None, Some(err.clone()));
                (Err(err), events)
            }
        }
    }

    pub fn create_session(&self, name: Option<&str>) -> std::io::Result<SessionFile> {
        let cwd = self.cwd.to_string_lossy().to_string();
        self.session_store.create(name, &cwd)
    }

    pub fn load_session(&self, session_id: &str) -> std::io::Result<SessionFile> {
        self.session_store.load(session_id)
    }

    pub fn list_sessions(&self) -> std::io::Result<Vec<SessionMetadata>> {
        self.session_store.list()
    }

    pub fn fork_session(&self, session_id: &str, from_entry_id: Option<&str>, name: Option<&str>) -> std::io::Result<SessionFile> {
        self.session_store.fork(session_id, from_entry_id, name)
    }

    pub fn append_user_text(&self, session_id: &str, text: &str) -> std::io::Result<SessionFile> {
        self.session_store.append_entry(
            session_id,
            SessionEntry {
                id: Uuid::new_v4().to_string(),
                parent_id: None,
                kind: "message".into(),
                role: Some("user".into()),
                text: Some(text.to_string()),
                tool_name: None,
                tool_input: None,
                result: None,
                created_at: Utc::now().timestamp_millis(),
            },
        )
    }
}

// ── Built-in Handler Constructor ──

/// Create the default set of Pi foundation tool handlers.
///
/// These are simple wrappers that shell out to system commands.
/// For production use, integrate with CodeWhale's `crates/tools` instead.
pub fn default_handlers() -> HashMap<String, ToolHandler> {
    let mut handlers: HashMap<String, ToolHandler> = HashMap::new();

    handlers.insert("read".into(), Box::new(|cwd, input| {
        let input: ReadToolInput = serde_json::from_value(input)
            .map_err(|e| format!("invalid read input: {e}"))?;
        let path = PathBuf::from(cwd).join(&input.path);
        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("read failed: {e}"))?;
        Ok(ToolResult {
            tool_name: "read".into(),
            content: vec![ContentBlock::Text(TextContent {
                content_type: "text".into(),
                text: content,
            })],
            details: None,
            is_error: false,
        })
    }));

    handlers.insert("write".into(), Box::new(|cwd, input| {
        let input: WriteToolInput = serde_json::from_value(input)
            .map_err(|e| format!("invalid write input: {e}"))?;
        let path = PathBuf::from(cwd).join(&input.path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("create dirs failed: {e}"))?;
        }
        std::fs::write(&path, &input.content)
            .map_err(|e| format!("write failed: {e}"))?;
        Ok(ToolResult {
            tool_name: "write".into(),
            content: vec![ContentBlock::Text(TextContent {
                content_type: "text".into(),
                text: format!("Successfully wrote {} bytes to {}", input.content.len(), input.path),
            })],
            details: None,
            is_error: false,
        })
    }));

    handlers.insert("bash".into(), Box::new(|_cwd, input| {
        let input: BashToolInput = serde_json::from_value(input)
            .map_err(|e| format!("invalid bash input: {e}"))?;
        let output = std::process::Command::new("cmd")
            .arg("/C")
            .arg(&input.command)
            .output()
            .map_err(|e| format!("bash execution failed: {e}"))?;
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let mut text = stdout;
        if !stderr.is_empty() {
            if !text.is_empty() { text.push('\n'); }
            text.push_str(&stderr);
        }
        Ok(ToolResult {
            tool_name: "bash".into(),
            content: vec![ContentBlock::Text(TextContent {
                content_type: "text".into(),
                text,
            })],
            details: None,
            is_error: !output.status.success(),
        })
    }));

    handlers
}

// ── Tests ──

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_foundation_spec_default() {
        let spec = default_foundation_spec();
        assert_eq!(spec.name, "pi-go-foundation");
        assert_eq!(spec.agent.initial_state.tools.len(), 7);
        assert_eq!(spec.run_event_sequence.len(), 10);
    }

    #[test]
    fn test_builtin_tools_have_exact_contracts() {
        let tools = builtin_tools();
        assert!(tools.iter().any(|t| t.name == "read"));
        assert!(tools.iter().any(|t| t.name == "write"));
        assert!(tools.iter().any(|t| t.name == "edit"));
        assert!(tools.iter().any(|t| t.name == "bash"));
        assert!(tools.iter().any(|t| t.name == "grep"));
        assert!(tools.iter().any(|t| t.name == "find"));
        assert!(tools.iter().any(|t| t.name == "ls"));
        for tool in &tools {
            assert!(tool.parameters.is_some(), "tool {} missing parameters", tool.name);
        }
    }

    #[test]
    fn test_session_store_create_and_load() {
        let dir = tempfile::tempdir().unwrap();
        let store = SessionStore::new(dir.path());
        let session = store.create(Some("test"), "/tmp").unwrap();
        assert!(!session.metadata.session_id.is_empty());
        let loaded = store.load(&session.metadata.session_id).unwrap();
        assert_eq!(loaded.metadata.name, Some("test".into()));
        assert_eq!(loaded.metadata.working_dir, "/tmp");
    }

    #[test]
    fn test_session_store_append_entry() {
        let dir = tempfile::tempdir().unwrap();
        let store = SessionStore::new(dir.path());
        let session = store.create(Some("test"), "/tmp").unwrap();

        let entry = SessionEntry {
            id: Uuid::new_v4().to_string(),
            parent_id: None,
            kind: "message".into(),
            role: Some("user".into()),
            text: Some("hello".into()),
            tool_name: None,
            tool_input: None,
            result: None,
            created_at: Utc::now().timestamp_millis(),
        };
        store.append_entry(&session.metadata.session_id, entry).unwrap();
        let loaded = store.load(&session.metadata.session_id).unwrap();
        assert_eq!(loaded.entries.len(), 1);
    }

    #[test]
    fn test_session_store_fork() {
        let dir = tempfile::tempdir().unwrap();
        let store = SessionStore::new(dir.path());
        let session = store.create(Some("original"), "/tmp").unwrap();

        let entry = SessionEntry {
            id: "fork-marker".into(),
            parent_id: None,
            kind: "message".into(),
            role: Some("user".into()),
            text: Some("before fork".into()),
            tool_name: None,
            tool_input: None,
            result: None,
            created_at: Utc::now().timestamp_millis(),
        };
        store.append_entry(&session.metadata.session_id, entry).unwrap();

        let forked = store.fork(&session.metadata.session_id, Some("fork-marker"), Some("forked")).unwrap();
        assert_eq!(forked.entries.len(), 1);
        assert_eq!(forked.metadata.name, Some("forked".into()));

        // Load original — should still have 1 entry too (fork doesn't mutate original)
        let original = store.load(&session.metadata.session_id).unwrap();
        assert_eq!(original.entries.len(), 1);
    }

    #[test]
    fn test_runtime_emits_events() {
        let dir = tempfile::tempdir().unwrap();
        let rt = Runtime::new(dir.path(), Some(SessionStore::new(dir.path())));
        rt.register_tool("test_tool", Box::new(|_cwd, input| {
            Ok(ToolResult {
                tool_name: "test_tool".into(),
                content: vec![ContentBlock::Text(TextContent {
                    content_type: "text".into(),
                    text: input.get("msg").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                })],
                details: None,
                is_error: false,
            })
        }));

        let input = serde_json::json!({"msg": "hello from pi"});
        let (result, events) = rt.execute_tool(None, "test_tool", &input, None);

        assert!(result.is_ok());
        assert_eq!(events.len(), 8); // agent -> turn -> message -> message end -> tool start -> tool end -> turn end -> agent end
        assert_eq!(events[0].event_type, RunEventType::AgentStart);
        assert_eq!(events[4].event_type, RunEventType::ToolExecutionStart);
        assert_eq!(events[5].event_type, RunEventType::ToolExecutionEnd);
        assert_eq!(events[7].event_type, RunEventType::AgentEnd);
    }

    #[test]
    fn test_runtime_persists_to_session() {
        let dir = tempfile::tempdir().unwrap();
        let rt = Runtime::new(dir.path(), Some(SessionStore::new(dir.path())));
        rt.register_tool("write", Box::new(|cwd, input| {
            let input: WriteToolInput = serde_json::from_value(input)
                .map_err(|e| format!("invalid write: {e}"))?;
            let path = PathBuf::from(cwd).join(&input.path);
            std::fs::write(&path, &input.content)
                .map_err(|e| format!("write failed: {e}"))?;
            Ok(ToolResult {
                tool_name: "write".into(),
                content: vec![ContentBlock::Text(TextContent {
                    content_type: "text".into(),
                    text: "ok".into(),
                })],
                details: None,
                is_error: false,
            })
        }));

        let session = rt.create_session(Some("pi-test")).unwrap();
        let input = serde_json::json!({"path": "pi.txt", "content": "3.14159"});
        let (result, _) = rt.execute_tool(Some(&session.metadata.session_id), "write", &input, None);
        assert!(result.is_ok());

        let loaded = rt.load_session(&session.metadata.session_id).unwrap();
        assert_eq!(loaded.entries.len(), 1);
        assert_eq!(loaded.entries[0].kind, "tool_call");
    }
}


