-- Meta (Muse subscription) provider for maki.
-- Native OAuth device-code flow, mirroring pi's meta.js implementation.
-- Model spec: openai-responses at https://api.meta.ai/v1 (~1M context).
-- Credential order: plugin store -> META_MUSE_API_KEY env -> pi auth.json.
-- Never logs or prints secret values (lengths only).

local CLIENT_ID = "1031625952748946"
local AUTH_HOST = "https://auth.meta.com"
local DEVICE_AUTH_URL = AUTH_HOST .. "/oidc/device/authorization/"
local DEVICE_TOKEN_URL = AUTH_HOST .. "/oidc/device/token/"
local MINT_URL = "https://api.meta.ai/muse-code/key"
local KEY_LIFETIME_MS = 24 * 60 * 60 * 1000

local function log_info(msg)
  maki.log.info("[meta] " .. msg)
end

local function now_ms()
  return math.floor(os.time() * 1000)
end

-- POST form helper via maki.net (public hosts, no private-IP issue).
local function post_form(url, params, extra_headers)
  local function enc(str)
    return tostring(str):gsub("[^%w%-%._~]", function(c) return string.format("%%%02X", string.byte(c)) end)
  end
  local parts = {}
  for k, v in pairs(params) do
    parts[#parts + 1] = enc(k) .. "=" .. enc(v)
  end
  local headers = { ["Content-Type"] = "application/x-www-form-urlencoded", ["Accept"] = "application/json" }
  if extra_headers then
    for k, v in pairs(extra_headers) do
      headers[k] = v
    end
  end
  return maki.net.request(url, {
    method = "POST",
    headers = headers,
    body = table.concat(parts, "&"),
    timeout = 30,
    retry = 0,
  })
end

local function post_json(url, tbl, bearer)
  local headers = { ["Accept"] = "application/json", ["Content-Type"] = "application/json" }
  if bearer then
    headers["Authorization"] = "Bearer " .. bearer
    headers["x-api-version"] = "1.0.0"
  end
  return maki.net.request(url, {
    method = "POST",
    headers = headers,
    body = maki.json.encode(tbl or {}),
    timeout = 30,
    retry = 0,
  })
end

local function err_of(res, prefix)
  local detail = ""
  if res and res.body then
    local ok, j = pcall(maki.json.decode, res.body)
    if ok and type(j) == "table" then
      for _, k in ipairs({ "error_description", "detail", "message", "error" }) do
        if type(j[k]) == "string" and j[k] ~= "" then
          detail = ": " .. j[k]:sub(1, 200)
          break
        end
      end
    end
    if detail == "" then
      detail = ": " .. tostring(res.body):sub(1, 200)
    end
  end
  return (prefix or "request failed") .. " (status " .. tostring(res and res.status) .. ")" .. detail
end

-- Read pi's stored Meta OAuth (same source the kernel uses). Secrets stay
-- in memory; only key names / lengths are ever logged.
local function pi_meta_creds()
  local home = maki.uv.os_homedir()
  if not home then
    return nil
  end
  local path = home .. "/.pi/agent/auth.json"
  local text, rerr = maki.fs.read(path)
  if rerr or not text then
    return nil
  end
  local ok, auth = pcall(maki.json.decode, text)
  if not ok or type(auth) ~= "table" then
    return nil
  end
  local m = auth["meta"]
  if type(m) ~= "table" then
    return nil
  end
  return { access = m.access, refresh = m.refresh, expires = m.expires }
end

-- Mint a 24h Muse API key from an identity token. Returns {access, expires}.
local function mint_api_key(identity_token)
  local res, rerr = post_json(MINT_URL, {}, identity_token)
  if rerr or not res then
    return nil, "mint request failed: " .. tostring(rerr)
  end
  if res.status == 401 or res.status == 403 then
    return nil, "Meta session expired (status " .. res.status .. "). Run `maki auth login meta` to sign in again."
  end
  if res.status ~= 200 then
    return nil, err_of(res, "Meta API key mint failed")
  end
  local ok, j = pcall(maki.json.decode, res.body or "")
  if not ok or type(j) ~= "table" or type(j.api_key) ~= "string" or j.api_key == "" then
    return nil, "Meta did not issue an API key."
  end
  return { access = j.api_key, expires = now_ms() + KEY_LIFETIME_MS }
end

local function stored_creds()
  local c = maki.provider.auth.get("meta")
  if type(c) == "table" then
    return c
  end
  return {}
end

-- Resolve a usable access token: plugin store, then env, then pi OAuth.
-- On expiry, re-mint from the stored/pi identity token and persist.
local function resolve_access()
  local c = stored_creds()
  if type(c.access) == "string" and c.access ~= "" then
    if type(c.expires) ~= "number" or c.expires > now_ms() + 60000 then
      return c.access, nil
    end
  end
  local env_key = maki.uv.os_getenv("META_MUSE_API_KEY")
  if type(env_key) == "string" and env_key ~= "" then
    return env_key, nil
  end
  local pi = pi_meta_creds()
  if pi and type(pi.access) == "string" and pi.access ~= "" then
    local fresh, merr = mint_api_key(pi.refresh or "")
    if fresh then
      maki.provider.auth.set("meta", { refresh = pi.refresh, access = fresh.access, expires = fresh.expires })
      log_info("minted fresh key from pi identity (len " .. #fresh.access .. ")")
      return fresh.access, nil
    end
    log_info("pi-identity mint failed, falling back to pi access token (len " .. #pi.access .. ")")
    return pi.access, nil
  end
  if type(c.refresh) == "string" and c.refresh ~= "" then
    local fresh, merr = mint_api_key(c.refresh)
    if fresh then
      maki.provider.auth.set("meta", { refresh = c.refresh, access = fresh.access, expires = fresh.expires })
      return fresh.access, nil
    end
    return nil, merr
  end
  return nil, "no Meta credential: run `maki auth login meta`"
end
local function auth_hook(ctx, purpose)
  if purpose == "refresh" then
    local c = stored_creds()
    local idtok = c.refresh
    if (not idtok or idtok == "") then
      local pi = pi_meta_creds()
      idtok = pi and pi.refresh
    end
    if type(idtok) == "string" and idtok ~= "" then
      local fresh, merr = mint_api_key(idtok)
      if fresh then
        maki.provider.auth.set("meta", { refresh = idtok, access = fresh.access, expires = fresh.expires })
        return { headers = { Authorization = "Bearer " .. fresh.access } }
      end
      return nil, merr
    end
    return nil, "Meta refresh failed: no identity token. Run `maki auth login meta`."
  end
  local access, aerr = resolve_access()
  if not access then
    return nil, aerr
  end
  return { headers = { Authorization = "Bearer " .. access } }
end

local function list_models(ctx)
  return {
    { id = "muse-spark-1.3-contributor", tier = "strong", context_window = 1048576,
      max_output_tokens = 131072, supports_thinking = true, supports_vision = true },
    { id = "muse-spark-1.3", tier = "strong", context_window = 1048576,
      max_output_tokens = 131072, supports_thinking = true, supports_vision = true },
    { id = "muse-spark-1.2-contributor", tier = "strong", context_window = 1048576,
      max_output_tokens = 131072, supports_thinking = true, supports_vision = true,
      pricing = { input = 0.1, output = 0.4, cache_read = 0.01, cache_write = 0.02 } },
    { id = "muse-spark-1.2", tier = "strong", context_window = 1048576,
      max_output_tokens = 131072, supports_thinking = true, supports_vision = true,
      pricing = { input = 1.25, output = 4.25, cache_read = 0.3, cache_write = 0.5 } },
  }
end

-- Device-code login: prints code, opens browser, polls, mints, stores.
local function login_hook(ctx)
  ctx.print("Starting Meta device login...")
  local res, rerr = post_form(DEVICE_AUTH_URL, { client_id = CLIENT_ID })
  if rerr or not res or res.status ~= 200 then
    ctx.print("Device authorization failed: " .. tostring(rerr or (res and res.status)))
    return nil, "device authorization failed"
  end
  local ok, j = pcall(maki.json.decode, res.body or "")
  if not ok or type(j) ~= "table" or type(j.device_code) ~= "string" then
    return nil, "bad device authorization response"
  end
  local uri = j.verification_uri_complete or j.verification_uri
  ctx.print("Go to: " .. tostring(uri))
  ctx.print("Enter code: " .. tostring(j.user_code))
  pcall(function() ctx.open_url(uri) end)
  local interval = math.max(5, tonumber(j.interval) or 5)
  local deadline = os.time() + math.min(900, tonumber(j.expires_in) or 900)
  while os.time() < deadline do
    maki.async.sleep(interval * 1000)
    local pr, perr = post_form(DEVICE_TOKEN_URL, {
      grant_type = "urn:ietf:params:oauth:grant-type:device_code",
      device_code = j.device_code, client_id = CLIENT_ID,
    })
    if pr and pr.status == 200 then
      local pok, pj = pcall(maki.json.decode, pr.body or "")
      if pok and type(pj) == "table" and type(pj.access_token) == "string" then
        ctx.print("Identity granted. Minting Muse API key...")
        local minted, merr = mint_api_key(pj.access_token)
        if not minted then
          return nil, merr
        end
        maki.provider.auth.set("meta", {
          refresh = pj.access_token, access = minted.access, expires = minted.expires,
        })
        ctx.print("Meta login complete (key valid 24h, auto-refreshes).")
        return true
      end
    elseif pr then
      local eok, ej = pcall(maki.json.decode, pr.body or "")
      local e = (eok and type(ej) == "table" and ej.error) or ""
      if e == "access_denied" then
        return nil, "Meta login was denied."
      elseif e == "expired_token" then
        return nil, "Device code expired. Run `maki auth login meta` again."
      elseif e == "slow_down" then
        interval = interval + 5
      end
    end
  end
  return nil, "Meta device flow timed out."
end

-- Guard: global + project init.lua both require this module.
-- maki sandboxes _G readonly, so pcall-skip on duplicate registration.
local ok_reg, err_reg = pcall(maki.provider.register, {
  slug = "meta",
  display_name = "Meta (Muse subscription)",
  codec = "openai-responses",
  base_url = "https://api.meta.ai/v1",
  default_model = "muse-spark-1.3-contributor",
  login_url = "https://auth.meta.com",
  context_window = 1048576,
  max_output_tokens = 131072,
  models = {
    { prefixes = { "muse-spark" }, tier = "strong", context_window = 1048576, max_output_tokens = 131072 },
  },
  auth = auth_hook,
  list_models = list_models,
  login = login_hook,
  logout = function(ctx)
    maki.provider.auth.clear("meta")
  end,
  map_error = function(ctx, status, message)
    if status == 401 then
      return { status = status, message = "Meta unauthorized — run `maki auth login meta` to refresh." }
    end
    return nil
  end,
})
if not ok_reg then
  if tostring(err_reg):find("already registered") then
    log_info("meta provider already registered (global+project double-load skipped)")
  else
    error(err_reg)
  end
else
log_info("meta provider registered (openai-responses @ api.meta.ai)")

end
