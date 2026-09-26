//! # Engine Extension Integration
//!
//! Bridges the [`codewhale_foundation_pi::extension`] API into the CodeWhale engine.
//!
//! ## Integration Points
//!
//! Each function below shows where to add hook dispatches in the CodeWhale engine.
//! These are the minimal changes needed to bring the Pi extension's full
//! functionality to CodeWhale.
//!
//! ## 1. Engine struct — add ExtensionManager
//!
//! In `crates/tui/src/core/engine.rs`, add to the Engine struct:
//! ```ignore
//! use codewhale_foundation_pi::extension::ExtensionManager;
//! // In Engine struct fields:
//! pub(crate) extension_manager: ExtensionManager,
//! ```
//!
//! ## 2. Session start — in session creation
//!
//! In `crates/tui/src/session_manager.rs` at the `create_saved_session` function
//! (around line 753), after the session is created:
//! ```ignore
//! if let Some(ext_mgr) = &extension_manager {
//!     ext_mgr.dispatch(&HookEvent::SessionStart {
//!         session_id: session.id.clone(),
//!         reason: "new".into(),
//!     }).await;
//! }
//! ```
//!
//! ## 3. Before agent start — in handle_send_message
//!
//! In `crates/tui/src/core/engine.rs`, in `handle_send_message` at ~line 2350,
//! after the user message is prepared but before the LLM call:
//! ```ignore
//! let ext_results = self.extension_manager.dispatch(&HookEvent::BeforeAgentStart {
//!     system_prompt: system_prompt.clone(),
//!     prompt: content.clone(),
//!     is_first_turn: self.turn_counter == 1,
//! }).await;
//! for result in &ext_results {
//!     if let Some(ref new_prompt) = result.system_prompt {
//!         // Replace system prompt with extension-modified version
//!     }
//!     if let Some(ref input_text) = result.prompt {
//!         // Replace user input with extension-modified version
//!     }
//! }
//! ```
//!
//! ## 4. Tool call — in execute_tool_with_lock
//!
//! In `crates/tui/src/core/engine/tool_execution.rs`, in `execute_tool_with_lock`
//! at ~line 380, before the `outcome` assignment:
//! ```ignore
//! // Dispatch tool_call hook
//! if let Some(ref ext_mgr) = engine_extension_manager {
//!     ext_mgr.dispatch(&HookEvent::ToolCall {
//!         tool_name: tool_name.clone(),
//!         args: tool_input.clone(),
//!         turn_id: current_turn_id.clone(),
//!     }).await;
//! }
//! ```
//! And after the `outcome` assignment, dispatch ToolResult.
//!
//! ## 5. Turn end — after LLM turn completes
//!
//! In `crates/tui/src/core/engine/turn_loop.rs`, after a turn completes:
//! ```ignore
//! let _ = extension_manager.dispatch(&HookEvent::TurnEnd {
//!     turn_id: turn.id.clone(),
//!     message_count: messages.len(),
//!     tool_count: tool_calls.len(),
//! }).await;
//! ```
//!
//! ## 6. Input transformation — in ui.rs composer handler
//!
//! In `crates/tui/src/tui/ui.rs`, where user input is processed (around lines where
//! the composer text is about to be sent to the engine):
//! ```ignore
//! // Transform input through extensions
//! let results = extension_manager.dispatch(&HookEvent::Input {
//!     text: app.input.clone(),
//! }).await;
//! for result in &results {
//!     if let Some(ref transformed) = result.prompt {
//!         app.input = transformed.clone();
//!     }
//! }
//! ```
//!
//! ## Files Modified
//!
//! | File | Change |
//! |------|--------|
//! | `crates/tui/Cargo.toml` | Add `codewhale-foundation-pi` dependency |
//! | `crates/tui/src/core/engine.rs` | Add `extension_manager` field + dispatch in handle_send_message |
//! | `crates/tui/src/core/engine/tool_execution.rs` | Add tool_call/tool_result dispatch |
//! | `crates/tui/src/core/engine/turn_loop.rs` | Add turn_end dispatch |
//! | `crates/tui/src/session_manager.rs` | Add session_start dispatch |
//! | `crates/tui/src/tui/ui.rs` | Add input transformation dispatch |

pub fn integration_guide() -> &'static str {
    "See module-level docs above for integration instructions."
}
