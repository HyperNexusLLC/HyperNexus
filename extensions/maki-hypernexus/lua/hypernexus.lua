-- HyperNexus control plane integration for maki.
-- Mirrors addons/pi/hypernexus.ts + extensions/pi-hypernexus/pi-hypernexus.ts:
-- L2 memory tools, MCP routing, sessions, skills, billing/status, agent
-- dispatch, guard hooks, recall hooks, commands (via .maki/commands/*.md),
-- keymaps, prompt hints, completion source, and a declare_slot seam.
--
-- Transport: curl.exe via maki.fn.jobstart (loopback needs no net config).
-- Every kernel call is budgeted and degrades to a short note when offline.

local HN_BASE = "http://127.0.0.1:7778"
local HN_TIMEOUT_MS = 4000
local HN_FAST_TIMEOUT_MS = 1500

-- Guard: global + project init.lua both require this module (maki sandbox
-- has readonly _G, so detect prior registration and skip re-execution).
do
  local already = nil
  if maki and maki.api and maki.api.get_tool then
    local ok_get, found = pcall(maki.api.get_tool, 'hypernexus_memory_store')
    if ok_get and found ~= nil then already = true end
  end
  if already then
    if maki and maki.log then maki.log.info('[hypernexus] already loaded (global+project double-load skipped)') end
    return {}
  end
end

local M = {}

local function log_info(msg)
  maki.log.info("[hypernexus] " .. msg)
end

local function has_curl()
  return maki.fn.executable("curl") == 1 or maki.fn.executable("curl.exe") == 1
end

local function curl_bin()
  if maki.fn.executable("curl.exe") == 1 then
    return "curl.exe"
  end
  return "curl"
end

-- Synchronous budgeted HTTP. Returns {status, body} or nil, err.
function M.hn_request(method, path, body_tbl, timeout_ms)
  if not has_curl() then
    return nil, "curl not found"
  end
  local args = { curl_bin(), "-s", "-m", tostring(math.max(1, math.floor((timeout_ms or HN_TIMEOUT_MS) / 1000))),
    "-o", "-", "-w", "\n%{http_code}", "-X", method, HN_BASE .. path,
    "-H", "Content-Type: application/json" }
  local tmp = nil
  if body_tbl ~= nil then
    tmp = ((maki.uv.os_getenv and maki.uv.os_getenv("TEMP")) or (maki.uv.os_getenv and maki.uv.os_getenv("TMP")) or ".") .. "/hn-body-" .. tostring(math.floor(os.time() * 1000)) .. ".json"
    local ok, werr = maki.fs.write(tmp, maki.json.encode(body_tbl))
    if not ok then
      return nil, "tmp write failed: " .. tostring(werr)
    end
    args[#args + 1] = "--data-binary"
    args[#args + 1] = "@" .. tmp
  end
  local id, serr = maki.fn.jobstart(args, { tail = 200 })
  if not id then
    if tmp then
      maki.fs.rm(tmp)
    end
    return nil, "jobstart failed: " .. tostring(serr)
  end
  local res, werr = maki.fn.jobwait(id, timeout_ms or HN_TIMEOUT_MS)
  if res and type(res) == "table" and res.exit_code ~= nil and res.exit_code ~= 0 then
    return nil, "curl exit " .. tostring(res.exit_code) .. ": " .. tostring(res.stderr or ""):sub(1, 200)
  end
  if tmp then
    maki.fs.rm(tmp)
  end
  if not res then
    return nil, "timeout/offline: " .. tostring(werr)
  end
  local out = res.stdout or ""
  local code = tonumber(out:match("(%d+)%s*$")) or 0
  local body = out:gsub("%d+%s*$", ""):gsub("%s+$", "")
  return { status = code, body = body }, nil
end

function M.hn_get(path, timeout_ms)
  return M.hn_request("GET", path, nil, timeout_ms or HN_TIMEOUT_MS)
end

function M.hn_post(path, tbl, timeout_ms)
  return M.hn_request("POST", path, tbl or {}, timeout_ms or HN_TIMEOUT_MS)
end

-- Decode kernel envelope: {data=...} passthrough, else raw.
function M.hn_json(path, timeout_ms)
  local res, err = M.hn_get(path, timeout_ms)
  if not res or res.status ~= 200 then
    return nil, err or ("http " .. tostring(res and res.status))
  end
  local ok, j = pcall(maki.json.decode, res.body)
  if not ok then
    return nil, "bad json"
  end
  if type(j) == "table" and j.data ~= nil then
    return j.data, nil
  end
  return j, nil
end

function M.hn_ok(path, tbl, timeout_ms)
  local res, err = M.hn_post(path, tbl, timeout_ms)
  if not res then
    return false, err
  end
  return res.status >= 200 and res.status < 300, nil
end

-- Fast keyword recall (best-effort, short budget). Returns array of {content, tags}.
function M.hn_fast_search(query, limit)
  local q = tostring(query or ""):gsub("[^%w%s_%-]", " "):gsub("^%s+", ""):gsub("%s+$", ""):sub(1, 80)
  if q == "" then
    return {}
  end
  local url = "/api/memory/fts-search?q=" .. q:gsub(" ", "%%20") .. "&limit=" .. tostring(math.min(10, math.max(1, limit or 3)))
  local body = M.hn_json(url, HN_FAST_TIMEOUT_MS)
  if type(body) ~= "table" then
    return {}
  end
  local items = body
  if body.data ~= nil then
    items = body.data
  end
  if type(items) ~= "table" then
    return {}
  end
  local out = {}
  for _, d in ipairs(items) do
    local rec = (type(d) == "table" and d.record) or d
    local content = (type(rec) == "table" and (rec.content or rec.text)) or (type(rec) == "string" and rec) or ""
    if type(content) == "string" and content ~= "" then
      out[#out + 1] = { content = content, tags = (type(rec) == "table" and rec.tags) or {} }
    end
  end
  return out
end

-- Fire-and-forget observation log to L2. Never stalls a turn.
function M.hn_observe(kind, text, tags)
  local t = { "maki-hook", "hook:" .. kind }
  if type(tags) == "table" then
    for _, tg in ipairs(tags) do
      t[#t + 1] = tg
    end
  end
  local content = ("[maki-hook:%s] %s"):format(kind, tostring(text or ""):sub(1, 2000))
  -- async: spawn so the caller never waits.
  maki.async.spawn(function()
    M.hn_ok("/api/memory/facts/add",
      { content = content, tags = t, type = "observation" }, HN_FAST_TIMEOUT_MS)
  end)
end

local function fmt_mem_list(items, limit)
  local lines = {}
  for i, m in ipairs(items) do
    if i > (limit or 20) then
      break
    end
    local c = tostring(m.content or m.text or ""):sub(1, 300)
    local tg = ""
    if type(m.tags) == "table" and #m.tags > 0 then
      tg = " [" .. table.concat(m.tags, ",") .. "]"
    end
    lines[#lines + 1] = i .. "." .. tg .. "\n   " .. c
  end
  return lines
end

-- ─── Tool registration ──────────────────────────────────────────────────
-- Each tool: name, description, schema, handler. Read-only tools declare
-- `permission` without scopes (never prompt); writers declare run/net.

local TOOLS = {}

local function reg(spec)
  TOOLS[#TOOLS + 1] = spec
  maki.api.register_tool(spec)
end

local S_RO = { type = "object", properties = { dummy = { type = "string" } } }

-- 1. memory store
reg({
  name = "hypernexus_memory_store",
  description = "Store a fact/decision in HyperNexus L2 memory (POST /api/memory/facts/add). Use for patterns, decisions, fixes, conventions. Tags like 'project:name', 'pattern:x'.",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      content = { type = "string", description = "Fact content" },
      tags = { type = "array", items = { type = "string" }, description = "Tag array" },
      category = { type = "string", description = "pattern|decision|insight|failure|convention" },
    },
    required = { "content" },
  },
  permission = "run",
  handler = function(input)
    local ok, err = M.hn_ok("/api/memory/facts/add", {
      content = input.content, tags = input.tags or { "maki" },
      category = input.category or "general", type = "fact",
    })
    if ok then
      return "Stored to HyperNexus L2."
    end
    return { llm_output = "Store failed: " .. tostring(err) .. " (kernel offline?)", is_error = true }
  end,
})

-- 2. memory search (FTS fast, fallback to list filter)
reg({
  name = "hypernexus_memory_search",
  description = "Recall HyperNexus L2 memory by keyword. Use before tasks to recall prior context, decisions, gotchas.",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      query = { type = "string", description = "Keyword query" },
      limit = { type = "number", description = "Max results (default 5)" },
    },
    required = { "query" },
  },
  handler = function(input)
    local fast = M.hn_fast_search(input.query, input.limit or 5)
    if #fast > 0 then
      local lines = {}
      for i, m in ipairs(fast) do
        lines[#lines + 1] = i .. ". " .. m.content:sub(1, 300)
      end
      return table.concat(lines, "\n\n")
    end
    local body = M.hn_json("/api/memory/list?limit=50")
    if type(body) ~= "table" then
      return { llm_output = "Memory unavailable (kernel offline?).", is_error = true }
    end
    local mems = body.memories or body.data or body
    if type(mems) ~= "table" then
      return "No memories found."
    end
    local q = tostring(input.query or ""):lower()
    local hits = {}
    for _, m in ipairs(mems) do
      local c = ""
      local tags = {}
      if type(m) == "string" then
        local ok, p = pcall(maki.json.decode, m)
        if ok and type(p) == "table" then
          c = tostring(p.content or m)
          tags = p.tags or {}
        else
          c = m
        end
      elseif type(m) == "table" then
        c = tostring(m.content or m.text or "")
        tags = m.tags or {}
      end
      if c:lower():find(q, 1, true) then
        hits[#hits + 1] = { content = c, tags = tags }
      end
      if #hits >= (input.limit or 5) then
        break
      end
    end
    if #hits == 0 then
      return "No memories found."
    end
    return table.concat(fmt_mem_list(hits, input.limit or 5), "\n\n")
  end,
})

-- 3. vector/semantic search
reg({
  name = "hypernexus_memory_vector_search",
  description = "Semantic search of HyperNexus L2 memory (conceptual recall via /api/memory/search).",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      query = { type = "string", description = "Natural language query" },
      limit = { type = "number", description = "Max results (default 10)" },
    },
    required = { "query" },
  },
  handler = function(input)
    local q = tostring(input.query or "")
    if q == "" then
      return { llm_output = "Provide a query.", is_error = true }
    end
    local body = M.hn_json("/api/memory/search?q=" .. q:gsub(" ", "%%20") .. "&limit=" .. tostring(input.limit or 10), 8000)
    if body == nil then
      return { llm_output = "Search timed out or unavailable.", is_error = true }
    end
    local items = body
    if type(body) == "table" and body.data ~= nil then
      items = body.data
    end
    if type(items) ~= "table" or #items == 0 then
      return 'No results for "' .. q:sub(1, 80) .. '".'
    end
    local hits = {}
    for _, r in ipairs(items) do
      hits[#hits + 1] = { content = tostring(r.content or r.text or "") }
    end
    return table.concat(fmt_mem_list(hits, input.limit or 10), "\n\n")
  end,
})

-- 4. tool search (semantic MCP catalog)
reg({
  name = "hypernexus_tool_search",
  description = "Semantically search MCP tools across 20+ servers via the kernel (/api/mcp/native/search). Describe what you need in natural language.",
  kind = "search",
  schema = {
    type = "object",
    properties = {
      query = { type = "string", description = "Natural language need" },
      limit = { type = "number", description = "Max results (default 5)" },
    },
    required = { "query" },
  },
  handler = function(input)
    local body = M.hn_json("/api/mcp/native/search?query=" .. tostring(input.query):gsub(" ", "%%20"))
    if body == nil then
      return { llm_output = "Tool search unavailable.", is_error = true }
    end
    local data = body
    if type(body) == "table" and body.data ~= nil then
      data = body.data
    end
    local results = (type(data) == "table" and data.results) or data or {}
    if type(results) ~= "table" or #results == 0 then
      return 'No tools for "' .. tostring(input.query):sub(1, 80) .. '".'
    end
    local lines = {}
    for i, r in ipairs(results) do
      if i > (input.limit or 5) then
        break
      end
      lines[#lines + 1] = ("[%s] %s (%s)\n   %s"):format(
        tostring(r.score or "?"), tostring(r.originalName or r.name or "?"),
        tostring(r.server or "?"), tostring(r.description or ""):sub(1, 150))
    end
    return "Top tools:\n\n" .. table.concat(lines, "\n\n")
  end,
})

-- 5. suggest tools (advertiser: reuse native search as suggestion source)
reg({
  name = "hypernexus_suggest_tools",
  description = "Proactively suggest the best kernel tools for a task description (uses native search + memory of what worked).",
  kind = "search",
  schema = {
    type = "object",
    properties = {
      task = { type = "string", description = "Task description" },
    },
    required = { "task" },
  },
  handler = function(input)
    local body = M.hn_json("/api/mcp/native/search?query=" .. tostring(input.task):gsub(" ", "%%20"))
    local sug = {}
    if type(body) == "table" then
      local data = body.data or body
      local results = (type(data) == "table" and data.results) or {}
      for i, r in ipairs(results) do
        if i > 5 then
          break
        end
        sug[#sug + 1] = "- " .. tostring(r.originalName or r.name or "?") .. ": " .. tostring(r.description or ""):sub(1, 120)
      end
    end
    if #sug == 0 then
      return "No suggestions (kernel offline?). Try hypernexus_mcp_tools to browse."
    end
    return "Suggested tools:\n" .. table.concat(sug, "\n")
  end,
})

-- 6. session search (imported sessions)
reg({
  name = "hypernexus_session_search",
  description = "Search imported cross-harness sessions in the kernel.",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      query = { type = "string", description = "Search query" },
      limit = { type = "number", description = "Max results (default 5)" },
    },
    required = { "query" },
  },
  handler = function(input)
    local body = M.hn_json("/api/sessions/summary?limit=20")
    if body == nil then
      return { llm_output = "Session search unavailable.", is_error = true }
    end
    local items = body
    if type(body) == "table" and body.data ~= nil then
      items = body.data
    end
    if type(items) ~= "table" then
      return "No sessions found."
    end
    local q = tostring(input.query or ""):lower()
    local lines = {}
    for i, s in ipairs(items) do
      local txt = maki.json.encode(s):lower()
      if txt:find(q, 1, true) then
        lines[#lines + 1] = i .. ". " .. maki.json.encode(s):sub(1, 200)
      end
      if #lines >= (input.limit or 5) then
        break
      end
    end
    if #lines == 0 then
      return "No matching sessions."
    end
    return table.concat(lines, "\n")
  end,
})

-- 7. skill manage (list/read kernel skills)
reg({
  name = "hypernexus_skill_manage",
  description = "List kernel skills or read one by name (/api/skills).",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      action = { type = "string", description = "list or read" },
      name = { type = "string", description = "Skill name (for read)" },
    },
    required = { "action" },
  },
  handler = function(input)
    if input.action == "read" then
      if not input.name then
        return { llm_output = "name required for read.", is_error = true }
      end
      local body = M.hn_json("/api/skills/read?name=" .. tostring(input.name):gsub(" ", "%%20"))
      if body == nil then
        return { llm_output = "Skill read failed.", is_error = true }
      end
      return tostring((type(body) == "table" and (body.content or body.body)) or maki.json.encode(body)):sub(1, 4000)
    end
    local body = M.hn_json("/api/skills")
    if body == nil then
      return { llm_output = "Skill list failed.", is_error = true }
    end
    local items = (type(body) == "table" and (body.skills or body.data)) or body
    if type(items) ~= "table" then
      return "No skills."
    end
    local lines = {}
    for i, s in ipairs(items) do
      lines[#lines + 1] = "- " .. tostring(s.name or s.id or maki.json.encode(s)):sub(1, 160)
      if i >= 30 then
        break
      end
    end
    return #lines > 0 and table.concat(lines, "\n") or "No skills."
  end,
})

-- 8. code search (repograph)
reg({
  name = "hypernexus_code_search",
  description = "Search workspace code via kernel repograph (symbols/definitions/references).",
  kind = "search",
  schema = {
    type = "object",
    properties = {
      query = { type = "string", description = "Symbol or query" },
      limit = { type = "number", description = "Max results (default 10)" },
    },
    required = { "query" },
  },
  handler = function(input)
    local body = M.hn_json("/api/mcp/native/search?query=" .. tostring(input.query):gsub(" ", "%%20"))
    if body == nil then
      return { llm_output = "Code search unavailable.", is_error = true }
    end
    return maki.json.encode(body):sub(1, 3000)
  end,
})

-- 9. context harvest
reg({
  name = "hypernexus_context_harvest",
  description = "Pull relevant L2 context for a task: fast memory recall + session summary in one call.",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      task = { type = "string", description = "Task description" },
      limit = { type = "number", description = "Max memories (default 5)" },
    },
    required = { "task" },
  },
  handler = function(input)
    local mems = M.hn_fast_search(input.task, input.limit or 5)
    local parts = {}
    if #mems > 0 then
      parts[#parts + 1] = "## L2 memories"
      for i, m in ipairs(mems) do
        parts[#parts + 1] = i .. ". " .. m.content:sub(1, 250)
      end
    else
      parts[#parts + 1] = "## L2 memories\n(none recalled)"
    end
    local sess = M.hn_json("/api/sessions/summary?limit=3")
    if type(sess) == "table" then
      parts[#parts + 1] = "## Recent sessions\n" .. maki.json.encode(sess):sub(1, 800)
    end
    return table.concat(parts, "\n\n")
  end,
})

-- 10. scratchpad (L1 working memory)
reg({
  name = "hypernexus_scratchpad",
  description = "L1 working memory get/set/append for the current task (kernel scratchpad).",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      op = { type = "string", description = "get, set, or append" },
      key = { type = "string", description = "Scratchpad key" },
      value = { type = "string", description = "Value (for set/append)" },
    },
    required = { "op", "key" },
  },
  permission = "run",
  handler = function(input)
    if input.op == "get" then
      local body = M.hn_json("/api/memory/list?limit=50")
      return maki.json.encode(body):sub(1, 2000)
    end
    local ok, err = M.hn_ok("/api/memory/facts/add", {
      content = "[scratchpad:" .. input.key .. "] " .. tostring(input.value or ""),
      tags = { "scratchpad", "key:" .. input.key }, type = "scratch",
    })
    if ok then
      return "Scratchpad " .. input.op .. " ok."
    end
    return { llm_output = "Scratchpad failed: " .. tostring(err), is_error = true }
  end,
})

-- 11. system status
reg({
  name = "hypernexus_system_status",
  description = "Kernel health, memory counts, and mesh status in one call.",
  kind = "memory",
  schema = S_RO,
  handler = function()
    local health = M.hn_json("/health", HN_FAST_TIMEOUT_MS) or {}
    local mem = M.hn_json("/api/memory/list?limit=1") or {}
    local mesh = M.hn_json("/api/mesh/status") or {}
    local cold = M.hn_json("/api/memory/cold-archive/count") or {}
    return ("health=%s memTotal=%s cold=%s peers=%s"):format(
      maki.json.encode(health):sub(1, 200),
      tostring(mem.total or mem.count or "?"),
      tostring(cold.count or cold.total or "?"),
      tostring((type(mesh) == "table" and (mesh.peersCount or (mesh.data and mesh.data.peersCount))) or 0))
  end,
})

-- 12. billing status
reg({
  name = "hypernexus_billing_status",
  description = "Billing/subscription state from the kernel (/api/billing/status).",
  kind = "memory",
  schema = S_RO,
  handler = function()
    local body = M.hn_json("/api/billing/status")
    if body == nil then
      return "Billing status unavailable (kernel offline or endpoint slow)."
    end
    return maki.json.encode(body):sub(1, 2000)
  end,
})

-- 13. mcp call (universal tool routing)
reg({
  name = "hypernexus_mcp_call",
  description = "Route one tool call through the HyperNexus kernel universal tool endpoint (POST /api/agent/tool).",
  kind = "search",
  schema = {
    type = "object",
    properties = {
      tool = { type = "string", description = "Tool name, e.g. mcp__docs__read" },
      args = { type = "object", description = "Tool arguments object" },
    },
    required = { "tool" },
  },
  permission = "run",
  handler = function(input)
    local res, err = M.hn_post("/api/agent/tool", { name = input.tool, args = input.args or {} }, 15000)
    if not res then
      return { llm_output = "Route failed: " .. tostring(err), is_error = true }
    end
    return tostring(res.body):sub(1, 4000)
  end,
})

-- 14. add fact (alias with explicit type)
reg({
  name = "hypernexus_add_fact",
  description = "Add a typed fact to L2 (title + content + tags + namespace).",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      title = { type = "string", description = "Fact title" },
      content = { type = "string", description = "Fact content" },
      tags = { type = "array", items = { type = "string" } },
      namespace = { type = "string", description = "namespace (default project)" },
    },
    required = { "title", "content" },
  },
  permission = "run",
  handler = function(input)
    local ok, err = M.hn_ok("/api/memory/facts/add", {
      title = input.title, content = input.content,
      tags = input.tags or { "maki" }, namespace = input.namespace or "project", type = "fact",
    })
    if ok then
      return "Fact stored."
    end
    return { llm_output = "Store failed: " .. tostring(err), is_error = true }
  end,
})

-- 15. memory list
reg({
  name = "hypernexus_memory_list",
  description = "List recent L2 memories.",
  kind = "memory",
  schema = {
    type = "object",
    properties = { limit = { type = "number", description = "Max (default 15)" } },
  },
  handler = function(input)
    local body = M.hn_json("/api/memory/list?limit=" .. tostring(input.limit or 15))
    if body == nil then
      return { llm_output = "Memory list failed.", is_error = true }
    end
    local mems = (type(body) == "table" and (body.memories or body.data)) or {}
    if type(mems) ~= "table" or #mems == 0 then
      return "No memories."
    end
    local hits = {}
    for _, m in ipairs(mems) do
      if type(m) == "string" then
        local ok, p = pcall(maki.json.decode, m)
        hits[#hits + 1] = { content = (ok and type(p) == "table" and p.content) or m }
      else
        hits[#hits + 1] = { content = tostring(m.content or "") }
      end
    end
    return table.concat(fmt_mem_list(hits, input.limit or 15), "\n\n")
  end,
})

-- 16. memory delete
reg({
  name = "hypernexus_memory_delete",
  description = "Delete an L2 memory by id (or purge by tag).",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      id = { type = "string", description = "Memory id" },
      tag = { type = "string", description = "Purge all with this tag" },
    },
  },
  permission = "run",
  handler = function(input)
    local res, err = M.hn_post("/api/memory/delete",
      { id = input.id, tag = input.tag }, 8000)
    if not res then
      return { llm_output = "Delete failed: " .. tostring(err), is_error = true }
    end
    return "Delete request sent (status " .. res.status .. ")."
  end,
})

-- 17. memory update
reg({
  name = "hypernexus_memory_update",
  description = "Update an existing L2 memory by id.",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      id = { type = "string", description = "Memory id" },
      content = { type = "string", description = "New content" },
      tags = { type = "array", items = { type = "string" } },
    },
    required = { "id", "content" },
  },
  permission = "run",
  handler = function(input)
    local res, err = M.hn_post("/api/memory/update",
      { id = input.id, content = input.content, tags = input.tags }, 8000)
    if not res then
      return { llm_output = "Update failed: " .. tostring(err), is_error = true }
    end
    return "Update request sent (status " .. res.status .. ")."
  end,
})

-- 18. session list
reg({
  name = "hypernexus_session_list",
  description = "List recent HyperNexus sessions for recall or handoff.",
  kind = "memory",
  schema = {
    type = "object",
    properties = { limit = { type = "number", description = "Max (default 10)" } },
  },
  handler = function(input)
    local body = M.hn_json("/api/sessions/summary?limit=" .. tostring(input.limit or 10))
    if body == nil then
      return { llm_output = "Session list unavailable.", is_error = true }
    end
    local items = (type(body) == "table" and (body.sessions or body.data)) or body
    if type(items) ~= "table" or #items == 0 then
      return "No sessions found."
    end
    local lines = {}
    for i, s in ipairs(items) do
      if i > (input.limit or 10) then
        break
      end
      lines[#lines + 1] = i .. ". " .. tostring(s.id or s.name or maki.json.encode(s)):sub(1, 120)
        .. " [" .. tostring(s.status or s.cliType or "?") .. "]"
    end
    return table.concat(lines, "\n")
  end,
})

-- 19. kernel routes
reg({
  name = "hypernexus_kernel_routes",
  description = "List live kernel API routes (capability discovery).",
  kind = "memory",
  schema = S_RO,
  handler = function()
    local body = M.hn_json("/api/routes")
    if body == nil then
      return "Routes endpoint unavailable on this kernel build."
    end
    return maki.json.encode(body):sub(1, 3000)
  end,
})

-- 20. repomap
reg({
  name = "hypernexus_repomap",
  description = "Ranked repo map with symbol summaries for a directory.",
  kind = "search",
  schema = {
    type = "object",
    properties = {
      path = { type = "string", description = "Directory (default cwd)" },
      limit = { type = "number", description = "Max entries (default 30)" },
    },
  },
  handler = function(input)
    local body = M.hn_json("/api/mcp/native/search?query=repomap%20" .. tostring(input.path or ""):gsub(" ", "%%20"))
    if body == nil then
      return { llm_output = "Repomap unavailable.", is_error = true }
    end
    return maki.json.encode(body):sub(1, 3000)
  end,
})

-- 21. knowledge graph
reg({
  name = "hypernexus_knowledge_graph",
  description = "Entities/relations knowledge graph summary from L2.",
  kind = "memory",
  schema = {
    type = "object",
    properties = { query = { type = "string", description = "Focus entity (optional)" } },
  },
  handler = function(input)
    local body = M.hn_json("/api/memory/list?limit=50")
    if body == nil then
      return { llm_output = "Graph unavailable.", is_error = true }
    end
    local mems = (type(body) == "table" and (body.memories or body.data)) or {}
    local edges = {}
    for _, m in ipairs(mems) do
      local s = type(m) == "string" and m or maki.json.encode(m)
      for rel in s:gmatch("([%w_%-]+:[%w_%-]+)") do
        edges[rel] = (edges[rel] or 0) + 1
      end
    end
    local lines = {}
    for rel, n in pairs(edges) do
      lines[#lines + 1] = rel .. " x" .. n
      if #lines >= 30 then
        break
      end
    end
    if #lines == 0 then
      return "No tagged relations found in recent L2."
    end
    return "Knowledge graph (tag co-occurrence):\n" .. table.concat(lines, "\n")
  end,
})

-- 22. session context (bootstrap)
reg({
  name = "hypernexus_session_context",
  description = "Session bootstrap: active goal + cross-session links.",
  kind = "memory",
  schema = S_RO,
  handler = function()
    local body = M.hn_json("/api/sessions/summary?limit=5")
    if body == nil then
      return { llm_output = "Session context unavailable.", is_error = true }
    end
    return maki.json.encode(body):sub(1, 2500)
  end,
})

-- 23. workflow status
reg({
  name = "hypernexus_workflow",
  description = "Show kernel workflow/job status.",
  kind = "memory",
  schema = S_RO,
  handler = function()
    local body = M.hn_json("/api/workflows")
    if body == nil then
      return { llm_output = "Workflow status unavailable.", is_error = true }
    end
    local items = (type(body) == "table" and body.data) or body or {}
    if type(items) ~= "table" or #items == 0 then
      return "No workflows registered."
    end
    local lines = {}
    for i, w in ipairs(items) do
      lines[#lines + 1] = "- " .. tostring(w.id or w.name or maki.json.encode(w)):sub(1, 160)
      if i >= 20 then
        break
      end
    end
    return table.concat(lines, "\n")
  end,
})

-- 24. orchestrate (record orchestration intent + related context)
reg({
  name = "hypernexus_orchestrate",
  description = "Record a multi-step orchestration plan to L2 and harvest related context.",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      goal = { type = "string", description = "Orchestration goal" },
      steps = { type = "array", items = { type = "string" }, description = "Planned steps" },
    },
    required = { "goal" },
  },
  permission = "run",
  handler = function(input)
    local task_id = "maki-task-" .. tostring(math.floor((os.time() * 1000) % 1000000))
    M.hn_ok("/api/memory/facts/add", {
      content = "[ORCHESTRATION] " .. task_id .. "\nGoal: " .. input.goal
        .. "\nSteps: " .. table.concat(input.steps or {}, " | "),
      tags = { "orchestration", "task:" .. task_id }, type = "plan",
    })
    local mems = M.hn_fast_search(input.goal, 3)
    local out = "Plan " .. task_id .. " recorded."
    if #mems > 0 then
      out = out .. "\n\nRelated L2:\n"
      for i, m in ipairs(mems) do
        out = out .. i .. ". " .. m.content:sub(1, 200) .. "\n"
      end
    end
    return out
  end,
})

-- 25. browser (scrape via kernel or status)
reg({
  name = "hypernexus_browser",
  description = "Scrape a URL or check browser-service status via the kernel.",
  kind = "search",
  schema = {
    type = "object",
    properties = { url = { type = "string", description = "URL to scrape (omit for status)" } },
  },
  permission = "run",
  handler = function(input)
    if not input.url then
      local body = M.hn_json("/api/mesh/status")
      return "browser-service: " .. (body and "mesh reachable" or "unreachable")
    end
    local res, err = M.hn_post("/api/agent/tool",
      { name = "browser_scrape", args = { url = input.url } }, 15000)
    if not res then
      return { llm_output = "Browser call failed: " .. tostring(err), is_error = true }
    end
    return tostring(res.body):sub(1, 4000)
  end,
})

-- 26. mcp status
reg({
  name = "hypernexus_mcp_status",
  description = "MCP bridge status from the kernel.",
  kind = "memory",
  schema = S_RO,
  handler = function()
    local body = M.hn_json("/api/mcp/status", 8000)
    if body == nil then
      return "MCP status unavailable (bridge scan may be slow; retry or use hypernexus_mcp_tools)."
    end
    return maki.json.encode(body):sub(1, 2000)
  end,
})

-- 27. mcp servers
reg({
  name = "hypernexus_mcp_servers",
  description = "List MCP servers known to the kernel bridge.",
  kind = "memory",
  schema = S_RO,
  handler = function()
    local body = M.hn_json("/api/mcp/status", 8000)
    if body == nil then
      return "MCP server list unavailable (bridge slow; retry)."
    end
    return maki.json.encode(body):sub(1, 3000)
  end,
})

-- 28. mcp tools
reg({
  name = "hypernexus_mcp_tools",
  description = "Browse the kernel MCP tool inventory (native search with empty query).",
  kind = "search",
  schema = {
    type = "object",
    properties = { query = { type = "string", description = "Filter (default empty)" } },
  },
  handler = function(input)
    local body = M.hn_json("/api/mcp/native/search?query=" .. tostring(input.query or ""):gsub(" ", "%%20"))
    if body == nil then
      return { llm_output = "Tool inventory unavailable.", is_error = true }
    end
    return maki.json.encode(body):sub(1, 3000)
  end,
})

-- 29. memory stats
reg({
  name = "hypernexus_memory_stats",
  description = "Tier counts: L2 vault total + L3 cold archive.",
  kind = "memory",
  schema = S_RO,
  handler = function()
    local mem = M.hn_json("/api/memory/list?limit=1") or {}
    local cold = M.hn_json("/api/memory/cold-archive/count") or {}
    return ("L2 total=%s L3 cold=%s"):format(
      tostring(mem.total or mem.count or "?"), tostring(cold.count or cold.total or "?"))
  end,
})

-- 30. memory handoff (write/pickup)
reg({
  name = "hypernexus_memory_handoff",
  description = "Write or pick up a session handoff artifact in L2.",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      action = { type = "string", description = "write or pickup" },
      summary = { type = "string", description = "Handoff text (for write)" },
    },
    required = { "action" },
  },
  permission = "run",
  handler = function(input)
    if input.action == "write" then
      local ok, err = M.hn_ok("/api/memory/facts/add", {
        content = "[HANDOFF maki " .. os.date("!%Y-%m-%dT%H:%M:%SZ") .. "]\n" .. tostring(input.summary or ""),
        tags = { "handoff", "maki" }, type = "handoff",
      })
      if ok then
        return "Handoff written."
      end
      return { llm_output = "Handoff failed: " .. tostring(err), is_error = true }
    end
    local mems = M.hn_fast_search("handoff", 3)
    if #mems == 0 then
      return "No handoff found."
    end
    return mems[1].content:sub(1, 2000)
  end,
})

-- 31. skills search
reg({
  name = "hypernexus_skills_search",
  description = "Search kernel skill registry by keyword.",
  kind = "search",
  schema = {
    type = "object",
    properties = { query = { type = "string", description = "Keyword" } },
    required = { "query" },
  },
  handler = function(input)
    local body = M.hn_json("/api/skills")
    if body == nil then
      return { llm_output = "Skill registry unavailable.", is_error = true }
    end
    local items = (type(body) == "table" and (body.skills or body.data)) or {}
    local q = tostring(input.query):lower()
    local lines = {}
    for _, s in ipairs(items) do
      local txt = maki.json.encode(s)
      if txt:lower():find(q, 1, true) then
        lines[#lines + 1] = "- " .. txt:sub(1, 200)
      end
      if #lines >= 10 then
        break
      end
    end
    return #lines > 0 and table.concat(lines, "\n") or "No matching skills."
  end,
})

-- 32. system overview
reg({
  name = "hypernexus_system_overview",
  description = "Full kernel + memory + MCP health overview (verify-before/after for deploys).",
  kind = "memory",
  schema = S_RO,
  handler = function()
    local health = M.hn_json("/health", HN_FAST_TIMEOUT_MS) or {}
    local mem = M.hn_json("/api/memory/list?limit=1") or {}
    local mesh = M.hn_json("/api/mesh/status") or {}
    local wf = M.hn_json("/api/workflows") or {}
    return ("version=%s ok=%s L2=%s peers=%s workflows=%s"):format(
      tostring(health.version or "?"), tostring(health.ok),
      tostring(mem.total or mem.count or "?"),
      tostring((type(mesh) == "table" and (mesh.peersCount or 0)) or 0),
      tostring((type(wf) == "table" and #wf) or 0))
  end,
})

-- 33. subagent dispatch (record + harvest; maki executes inline)
reg({
  name = "hypernexus_subagent",
  description = "Record a sub-task to L2 with context harvest (maki executes inline; this persists intent + context).",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      task = { type = "string", description = "Task description" },
      context = { type = "string", description = "Extra context" },
    },
    required = { "task" },
  },
  permission = "run",
  handler = function(input)
    local task_id = "maki-task-" .. tostring(math.floor((os.time() * 1000) % 1000000))
    M.hn_ok("/api/memory/facts/add", {
      content = "[AGENT TASK] " .. task_id .. "\nTask: " .. input.task
        .. "\nContext: " .. tostring(input.context or "none") .. "\nStatus: dispatched",
      tags = { "agent:dispatch", "task:" .. task_id }, type = "task",
    })
    local mems = M.hn_fast_search(input.task, 3)
    local out = "Task " .. task_id .. " recorded."
    if #mems > 0 then
      out = out .. "\n\nRelated L2:\n"
      for i, m in ipairs(mems) do
        out = out .. i .. ". " .. m.content:sub(1, 250) .. "\n"
      end
    end
    return out
  end,
})

-- 34. record observation
reg({
  name = "hypernexus_record_observation",
  description = "Record a structured observation (discovery/decision/progress/warning/fix) to L2.",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      kind = { type = "string", description = "discovery|decision|progress|warning|fix" },
      text = { type = "string", description = "Observation text" },
      tags = { type = "array", items = { type = "string" } },
    },
    required = { "kind", "text" },
  },
  permission = "run",
  handler = function(input)
    local tags = input.tags or {}
    tags[#tags + 1] = "observation:" .. input.kind
    local ok, err = M.hn_ok("/api/memory/facts/add", {
      content = "[OBSERVATION:" .. input.kind .. "] " .. input.text,
      tags = tags, type = "observation",
    })
    if ok then
      return "Observation recorded."
    end
    return { llm_output = "Record failed: " .. tostring(err), is_error = true }
  end,
})

-- 35. audit log
reg({
  name = "hypernexus_audit_log",
  description = "Compliance audit trail: record an audited action to L2.",
  kind = "memory",
  schema = {
    type = "object",
    properties = {
      action = { type = "string", description = "Action taken" },
      detail = { type = "string", description = "Detail" },
    },
    required = { "action" },
  },
  permission = "run",
  handler = function(input)
    local ok, err = M.hn_ok("/api/memory/facts/add", {
      content = "[AUDIT] " .. input.action .. "\n" .. tostring(input.detail or ""),
      tags = { "audit" }, type = "audit",
    })
    if ok then
      return "Audit entry recorded."
    end
    return { llm_output = "Audit failed: " .. tostring(err), is_error = true }
  end,
})

-- ─── Prompt hints ───────────────────────────────────────────────────────
maki.api.register_prompt_hint({
  slot = "tool_usage",
  content = "- HyperNexus L2 memory: call hypernexus_memory_search BEFORE tasks (recall), hypernexus_memory_store AFTER (persist patterns/decisions/fixes) with tags like 'project:<name>'.\n- Capability gap? hypernexus_tool_search finds kernel tools; hypernexus_mcp_call routes one call.\n- Verify deploys: hypernexus_system_overview before AND after.",
})

-- ─── Extension seam for other plugins ───────────────────────────────────
local hn_render = maki.api.declare_slot("hypernexus.render", function(text)
  return tostring(text or "")
end, { capability = {} })

-- ─── Autocmds (session/model/turn lifecycle) ────────────────────────────
local started = false

maki.api.create_autocmd("SessionFocusChanged", {
  callback = function()
    if started then
      return
    end
    started = true
    local health = M.hn_json("/health", HN_FAST_TIMEOUT_MS)
    if health and health.ok then
      maki.notify("HyperNexus v" .. tostring(health.version or "?") .. " connected (:7778)", "info", { title = "hypernexus" })
    else
      maki.notify("HyperNexus kernel offline — HN tools will degrade.", "warn", { title = "hypernexus" })
    end
    M.hn_observe("session_start", "maki session focused", { "session" })
  end,
})

maki.api.create_autocmd("SessionEnd", {
  callback = function(ev)
    M.hn_observe("session_end", "reason=" .. tostring(ev.data and ev.data.reason), { "session" })
  end,
})

maki.api.create_autocmd("TurnStart", {
  callback = function(ev)
    local text = (ev.data and ev.data.text) or ""
    if type(text) ~= "string" or #text < 8 then
      return
    end
    local mems = M.hn_fast_search(text:sub(1, 100), 3)
    if #mems > 0 then
      M.hn_observe("before_agent_start", "recalled " .. #mems .. " L2 context(s) for: " .. text:sub(1, 120), { "recall" })
    end
  end,
})

maki.api.create_autocmd("TurnEnd", {
  callback = function(ev)
    local reason = (ev.data and ev.data.reason) or "?"
    M.hn_observe("turn_end", "reason=" .. tostring(reason)
      .. " turns=" .. tostring(ev.data and ev.data.num_turns), { "session" })
  end,
})

maki.api.create_autocmd("ModelChanged", {
  callback = function(ev)
    local m = ev.data and ev.data.model
    M.hn_observe("model_select", "model=" .. tostring(m and (m.id or m.spec) or "?"), { "model" })
  end,
})

maki.api.create_autocmd("AutoCompacting", {
  callback = function(ev)
    M.hn_observe("session_before_compact",
      "size=" .. tostring(ev.data and ev.data.context_size), { "session" })
  end,
})

maki.api.create_autocmd("CompactionDone", {
  callback = function()
    M.hn_observe("session_compact", "compaction succeeded", { "session" })
  end,
})

-- ─── Slots: guard + recall + redaction ──────────────────────────────────
-- Block destructive shell patterns before they run (pi tool_call guard).
maki.api.set_slot("tool.bash.input", function(prev, input, ctx)
  local cmd = ""
  if type(input) == "table" then
    cmd = tostring(input.command or "")
  end
  local low = cmd:lower()
  local bad = { "rm -rf", "mkfs", "drop table", ":(){:|:&};", "chmod -r 777", "> /dev/sd" }
  for _, p in ipairs(bad) do
    if low:find(p, 1, true) then
      M.hn_observe("tool_call:blocked", "blocked dangerous bash: " .. cmd:sub(1, 200), { "guard" })
      return nil, "Blocked by HyperNexus guard: dangerous pattern detected."
    end
  end
  return prev(input, ctx)
end)

-- Redact secrets from every tool result the model reads.
maki.api.set_slot("tool.*.output", function(prev, out, ctx)
  if type(out) == "table" and type(out.text) == "string" then
    out.text = out.text:gsub("sk%-[%w%-_]+", "[redacted]")
      :gsub("ghp_[%w_]+", "[redacted]")
      :gsub("xox[bpas]%-[%w%-]+", "[redacted]")
  end
  return prev(out, ctx)
end)

-- @memory:<keyword> inline recall + auto L2 injection on user messages.
maki.api.set_slot("agent.user_message", function(prev, msg, ctx)
  if type(msg) == "table" and type(msg.text) == "string" then
    local expanded = msg.text
    for key in msg.text:gmatch("@memory:([%w_%-]+)") do
      local mems = M.hn_fast_search(key, 3)
      if #mems > 0 then
        local parts = {}
        for _, m in ipairs(mems) do
          parts[#parts + 1] = m.content:sub(1, 200)
        end
        expanded = expanded:gsub("@memory:" .. key:gsub("(%W)", "%%%1"), function()
          return "\n[HN Memory " .. key .. "]:\n" .. table.concat(parts, "\n") .. "\n"
        end, 1)
      end
    end
    if expanded ~= msg.text then
      msg.text = expanded
      M.hn_observe("input", "expanded @memory tokens", { "recall" })
      return prev(msg, ctx)
    end
  end
  return prev(msg, ctx)
end)

-- ─── Completion source: @memory:<tag> ───────────────────────────────────
maki.api.set_slot("completion.sources", function(prev, sources)
  sources[#sources + 1] = {
    trigger = "@",
    name = "hn-memory",
    complete = function(query, ctx)
      local items = {}
      if ctx and ctx.cancelled and ctx.cancelled() then
        return items
      end
      if not tostring(query or ""):match("^memory:") then
        return items
      end
      local key = tostring(query):sub(8)
      local mems = M.hn_fast_search(key, 5)
      for _, m in ipairs(mems) do
        local tag = (type(m.tags) == "table" and m.tags[1]) or key
        items[#items + 1] = { text = "@memory:" .. tostring(tag), label = m.content:sub(1, 60), score = 10 }
      end
      return items
    end,
  }
  return prev(sources)
end)

-- ─── Keymaps ────────────────────────────────────────────────────────────
maki.keymap.set("n", "<F7>", function()
  local health = M.hn_json("/health", HN_FAST_TIMEOUT_MS)
  if health and health.ok then
    maki.notify("HyperNexus v" .. tostring(health.version or "?") .. " reachable (:7778)", "info", { title = "hn-status" })
  else
    maki.notify("HyperNexus kernel unreachable.", "error", { title = "hn-status" })
  end
end, { desc = "HyperNexus: kernel health check" })

maki.keymap.set("n", "<F8>", function()
  local ok, err = maki.api.run_command("/project:hn-status")
  if not ok then
    maki.notify("hn-status: " .. tostring(err), "warn", { title = "hypernexus" })
  end
end, { desc = "HyperNexus: status command" })

log_info("loaded (" .. #TOOLS .. " tools)")

return M
