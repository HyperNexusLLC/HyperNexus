"""Mint a Meta Model API key from the pi OAuth session (mini-swe-agent helper).

Reads the identity token from ``~/.pi/agent/auth.json`` -> ``meta.refresh``
(pi owns OAuth refresh; nothing is stored here), POSTs to
``https://api.meta.ai/muse-code/key``, and prints ONLY the minted ``api_key``
to stdout (apiKeyHelper-style use).

Usage:
    python meta_oauth.py              # print minted key
    python meta_oauth.py --check      # exit 0 if mint works, 1 otherwise
    python meta_oauth.py --doctor     # exit 0 healthy, 2 reauth needed, 1 other
    python meta_oauth.py --help       # usage

Env overrides:
    META_AUTH_PATH      path to pi auth.json (default ~/.pi/agent/auth.json)
    META_KEY_MINT_URL   default https://api.meta.ai/muse-code/key
"""
import json
import os
import sys
import urllib.request

AUTH_PATH = os.environ.get(
    "META_AUTH_PATH",
    os.path.join(os.path.expanduser("~"), ".pi", "agent", "auth.json"),
)
MINT_URL = os.environ.get(
    "META_KEY_MINT_URL", "https://api.meta.ai/muse-code/key"
)
TIMEOUT_S = 30


class ReauthNeeded(Exception):
    pass


def read_identity_token(path=AUTH_PATH):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            raw = fh.read()
    except OSError as exc:
        raise ReauthNeeded(
            "cannot read auth file %s: %s. Run /login meta in pi first."
            % (path, exc)
        )
    try:
        data = json.loads(raw)
    except ValueError:
        raise ReauthNeeded("auth file %s is not valid JSON." % path)
    cred = (data or {}).get("meta")
    if (
        not isinstance(cred, dict)
        or cred.get("type") != "oauth"
        or not isinstance(cred.get("refresh"), str)
        or not cred.get("refresh")
    ):
        raise ReauthNeeded(
            "no Meta OAuth credential in %s (expected .meta.refresh). "
            "Run /login meta in pi to sign in." % path
        )
    return cred["refresh"]


def mint_api_key(identity, url=MINT_URL, timeout=TIMEOUT_S):
    req = urllib.request.Request(
        url,
        data=b"{}",
        headers={
            "Accept": "application/json",
            "Authorization": "Bearer %s" % identity,
            "Content-Type": "application/json",
            "x-api-version": "1.0.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            status = res.status
            body = res.read().decode("utf-8", "replace")
    except Exception as exc:
        code = getattr(exc, "code", None)
        if code in (401, 403):
            raise ReauthNeeded(
                "Meta session expired (HTTP %s). Identity tokens are not "
                "renewable - run /login meta in pi to sign in again." % code
            )
        raise RuntimeError("mint request failed: %s" % exc)
    if status in (401, 403):
        raise ReauthNeeded(
            "Meta session expired (HTTP %s). Identity tokens are not "
            "renewable - run /login meta in pi to sign in again." % status
        )
    if status < 200 or status >= 300:
        raise RuntimeError(
            "Meta API key mint failed (HTTP %s)." % status
        )
    try:
        payload = json.loads(body)
    except ValueError:
        payload = {}
    api_key = (payload or {}).get("api_key")
    if not isinstance(api_key, str) or not api_key:
        raise RuntimeError("Meta did not issue an API key.")
    return api_key


def main(argv):
    if "--help" in argv:
        sys.stdout.write(
            "meta_oauth: mint a Meta Model API key from the pi OAuth session.\n"
            "  (default)   print minted key to stdout\n"
            "  --check     exit 0 if mint works, 1 otherwise (key hidden)\n"
            "  --doctor    diagnose: exit 0 healthy, 2 reauth needed, 1 other\n"
            "  --help      this text\n"
        )
        return 0
    if "--doctor" in argv:
        try:
            identity = read_identity_token()
        except ReauthNeeded as exc:
            sys.stderr.write("[meta_oauth] REAUTH: %s\n" % exc)
            return 2
        try:
            mint_api_key(identity)
            sys.stderr.write("[meta_oauth] OK: mint works (key hidden).\n")
        except ReauthNeeded as exc:
            sys.stderr.write("[meta_oauth] REAUTH: %s\n" % exc)
            return 2
        except Exception as exc:  # noqa: BLE001 - CLI reports, never throws
            sys.stderr.write("[meta_oauth] MINT-FAILED: %s\n" % exc)
            return 1
        return 0
    check_only = "--check" in argv
    try:
        identity = read_identity_token()
    except ReauthNeeded as exc:
        sys.stderr.write("[meta_oauth] %s\n" % exc)
        return 1
    try:
        key = mint_api_key(identity)
    except ReauthNeeded as exc:
        sys.stderr.write("[meta_oauth] %s\n" % exc)
        return 1
    except Exception as exc:  # noqa: BLE001 - CLI reports, never throws
        sys.stderr.write("[meta_oauth] %s\n" % exc)
        return 1
    if check_only:
        sys.stderr.write("[meta_oauth] mint OK (key hidden)\n")
    else:
        sys.stdout.write(key)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
