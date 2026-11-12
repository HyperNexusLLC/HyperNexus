#!/bin/bash
# HyperNexus Health Monitor
# Run via cron: */5 * * * * /opt/hypernexus/scripts/health-monitor.sh

LOG="/var/log/hypernexus-health.log"
ALERT_EMAIL="hypernexusofficialllc@gmail.com"

timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log() {
    echo "[$(timestamp)] $1" >> "$LOG"
}

check_service() {
    local service=$1
    local status=$(systemctl is-active "$service" 2>/dev/null)
    if [ "$status" != "active" ]; then
        log "ALERT: $service is $status"
        # Restart failed service
        systemctl restart "$service" 2>/dev/null
        log "ACTION: Restarted $service"
    fi
}

check_port() {
    local port=$1
    local name=$2
    if ! netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        log "ALERT: $name port $port not listening"
    fi
}

check_disk() {
    local usage=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
    if [ "$usage" -gt 90 ]; then
        log "ALERT: Disk usage at ${usage}%"
    fi
}

check_memory() {
    local free_mb=$(free -m | awk '/^Mem:/{print $7}')
    if [ "$free_mb" -lt 500 ]; then
        log "ALERT: Available memory low: ${free_mb}MB"
    fi
}

# Run checks
log "--- Health Check Start ---"

check_service "hypernexus"
check_service "hypernexus-cloud"
check_service "hypernexus-dashboard"
check_service "marketing-agent"

check_port 7778 "Go Kernel"
check_port 7779 "Dashboard"
check_port 7780 "Cloud Server"
check_port 8084 "Marketing Agent"

check_disk
check_memory

# Check HTTP endpoints
for url in "http://localhost:7778/health" "http://localhost:7779/" "http://localhost:7780/api/cloud/health"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null)
    if [ "$code" != "200" ] && [ "$code" != "307" ]; then
        log "ALERT: $url returned $code"
    fi
done

log "--- Health Check End ---"
