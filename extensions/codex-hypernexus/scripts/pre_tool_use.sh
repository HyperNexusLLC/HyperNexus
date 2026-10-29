#!/bin/sh
# PreToolUse hook — pass-through guard.
cat >/dev/null 2>&1
echo '{"continue": true}'
exit 0
