#!/bin/sh
# Interrupt hook — pass-through, never block the interrupt.
read -r STDIN || true
echo '{"continue": true}'
