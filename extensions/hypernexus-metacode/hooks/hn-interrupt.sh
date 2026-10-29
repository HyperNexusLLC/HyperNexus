#!/bin/sh
# hn-interrupt: pass-through, never block the interrupt.
read -r STDIN || true
echo '{"continue": true}'
