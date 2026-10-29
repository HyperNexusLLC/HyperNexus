import json
import os
import time
import urllib.request
import urllib.parse
HN_BASE = os.environ.get('HYPERNEXUS_URL', 'http://127.0.0.1:7778')
HN_TIMEOUT_MS = 2500
HN_FAST_MS = 400
DANGER_SUBS = ['rm -rf', 'mkfs', 'shutdown', 'reboot', 'format']
def hn_url(p):
    return HN_BASE + p
def hn_is_dangerous(cmd):
    c = (cmd or '').lower()
    return any(s in c for s in DANGER_SUBS)
def hn_safe(x, n=2000):
    return str(x)[:n]
