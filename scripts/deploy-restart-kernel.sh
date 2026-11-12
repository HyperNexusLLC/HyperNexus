#!/bin/bash
# Stop service, kill all kernel processes, start clean
systemctl stop hypernexus-kernel 2>/dev/null
sleep 1
pkill -9 -f tormentnexus 2>/dev/null
pkill -9 -f hypernexus 2>/dev/null
sleep 2
systemctl reset-failed hypernexus-kernel 2>/dev/null
systemctl start hypernexus-kernel
sleep 5
echo "service: $(systemctl is-active hypernexus-kernel)"
echo "health: $(curl -s http://127.0.0.1:7778/health)"
