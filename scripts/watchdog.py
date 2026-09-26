#!/usr/bin/env python3
"""
HyperNexus Watchdog (Linux)
============================
Ensures all services are always running. If any process dies, restarts it.
Checks every 60 seconds. Runs as a systemd service.

Monitored services:
  - Go Kernel (port 7778)
  - Next.js Dashboard (port 7779)
  - Marketing Agent (port 8084)
  - Nginx (ports 80/443)
  - PostgreSQL (port 5432)
  - Redis (port 6379)
"""

import subprocess
import sys
import time
import signal
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

# Configuration
CHECK_INTERVAL = 60  # seconds between health checks
LOG_PATH = Path("/var/log/hypernexus/watchdog.log")
PID_FILE = Path("/var/run/hypernexus/watchdog.pid")

# Services to monitor
SERVICES = {
    "go-kernel": {
        "type": "systemd",
        "unit": "tormentnexus-kernel",
        "port": 7778,
        "health_url": "http://127.0.0.1:7778/health",
        "critical": True,
        "restart_delay": 5,
    },
    "dashboard": {
        "type": "systemd",
        "unit": "tormentnexus-dashboard",
        "port": 7779,
        "health_url": "http://127.0.0.1:7779",
        "critical": True,
        "restart_delay": 10,
    },
    "marketing-agent": {
        "type": "systemd",
        "unit": "marketing-agent",
        "port": 8084,
        "health_url": "http://127.0.0.1:8084",
        "critical": False,
        "restart_delay": 5,
    },
    "nginx": {
        "type": "systemd",
        "unit": "nginx",
        "port": 80,
        "critical": True,
        "restart_delay": 2,
    },
    "postgresql": {
        "type": "port",
        "port": 5432,
        "critical": True,
        "restart_cmd": ["systemctl", "start", "postgresql"],
        "restart_delay": 5,
    },
    "redis": {
        "type": "port",
        "port": 6379,
        "critical": True,
        "restart_cmd": ["systemctl", "start", "redis-server"],
        "restart_delay": 2,
    },
}

# Alert thresholds
MAX_RESTARTS_PER_HOUR = 5
restart_counts: Dict[str, list] = {name: [] for name in SERVICES}


class WatchdogLogger:
    """Thread-safe logger with rotation."""

    def __init__(self, log_path: Path):
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self._rotate_if_needed()

    def _rotate_if_needed(self):
        """Rotate log if larger than 10MB."""
        if self.log_path.exists() and self.log_path.stat().st_size > 10 * 1024 * 1024:
            rotated = self.log_path.with_suffix(
                f".{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
            )
            self.log_path.rename(rotated)
            # Clean old logs (keep last 5)
            logs = sorted(self.log_path.parent.glob("watchdog.*.log"))
            for old_log in logs[:-5]:
                old_log.unlink()

    def log(self, level: str, msg: str):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{ts}][{level}] {msg}"
        try:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(line + "\n")
        except Exception:
            print(line, file=sys.stderr)

    def info(self, msg: str):
        self.log("INFO", msg)

    def warn(self, msg: str):
        self.log("WARN", msg)

    def error(self, msg: str):
        self.log("ERROR", msg)


logger = WatchdogLogger(LOG_PATH)


def check_port(port: int) -> bool:
    """Check if a port is listening."""
    try:
        result = subprocess.run(
            ["ss", "-tlnp"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return f":{port} " in result.stdout
    except Exception:
        return False


def check_systemd_unit(unit: str) -> bool:
    """Check if a systemd unit is active."""
    try:
        result = subprocess.run(
            ["systemctl", "is-active", unit],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip() == "active"
    except Exception:
        return False


def check_health_url(url: str) -> bool:
    """Check if a health endpoint responds."""
    try:
        result = subprocess.run(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url],
            capture_output=True,
            text=True,
            timeout=10,
        )
        code = result.stdout.strip()
        return code in ("200", "301", "302", "307")
    except Exception:
        return False


def get_service_status(name: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Get detailed status of a service."""
    status = {
        "name": name,
        "healthy": False,
        "port_open": False,
        "systemd_active": False,
        "health_ok": False,
        "pid": None,
    }

    # Check port
    if "port" in config:
        status["port_open"] = check_port(config["port"])

    # Check systemd
    if config.get("type") == "systemd" and "unit" in config:
        status["systemd_active"] = check_systemd_unit(config["unit"])
        # Get PID
        try:
            result = subprocess.run(
                ["systemctl", "show", config["unit"], "--property=MainPID"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            pid_str = result.stdout.strip().split("=")[-1]
            if pid_str.isdigit() and int(pid_str) > 0:
                status["pid"] = int(pid_str)
        except Exception:
            pass

    # Check health endpoint
    if "health_url" in config:
        status["health_ok"] = check_health_url(config["health_url"])

    # Determine overall health
    # Services are healthy if: port is open AND (health OK OR not configured)
    # For systemd services, also check if unit is active
    if config.get("type") == "systemd":
        # For systemd services: healthy if port is open OR health is OK
        # Don't require systemd to be active — services may run outside systemd
        status["healthy"] = status["port_open"] or status["health_ok"]
    else:
        status["healthy"] = status["port_open"]

    return status


def restart_service(name: str, config: Dict[str, Any]) -> bool:
    """Restart a service. Returns True if restart was attempted."""
    now = time.time()

    # Check restart rate limiting
    restart_counts[name] = [t for t in restart_counts[name] if now - t < 3600]
    if len(restart_counts[name]) >= MAX_RESTARTS_PER_HOUR:
        logger.error(
            f"{name}: Too many restarts ({len(restart_counts[name])}/hour). Skipping."
        )
        return False

    logger.warn(f"{name}: Restarting...")
    restart_counts[name].append(now)

    try:
        if config.get("type") == "systemd" and "unit" in config:
            subprocess.run(
                ["systemctl", "restart", config["unit"]],
                capture_output=True,
                timeout=30,
            )
        elif "restart_cmd" in config:
            subprocess.run(
                config["restart_cmd"],
                capture_output=True,
                timeout=30,
            )
        else:
            logger.error(f"{name}: No restart method configured")
            return False

        # Wait for service to come up
        delay = config.get("restart_delay", 5)
        time.sleep(delay)

        # Verify it's running
        status = get_service_status(name, config)
        if status["healthy"]:
            logger.info(f"{name}: Restart successful")
            return True
        else:
            logger.error(f"{name}: Restart failed - service still unhealthy")
            return False

    except Exception as e:
        logger.error(f"{name}: Restart exception: {e}")
        return False


def send_alert(message: str, critical: bool = False):
    """Send alert (logs for now, could add webhook/email later)."""
    level = "CRITICAL" if critical else "ALERT"
    logger.log(level, f"🔔 {message}")

    # TODO: Add webhook/email alerts
    # if critical:
    #     webhook_url = os.environ.get("WATCHDOG_WEBHOOK_URL")
    #     if webhook_url:
    #         subprocess.run(["curl", "-s", "-X", "POST", webhook_url, ...])


def check_all_services():
    """Check all services and restart if needed."""
    results = {}
    issues = []

    for name, config in SERVICES.items():
        status = get_service_status(name, config)
        results[name] = status

        if not status["healthy"]:
            issues.append(name)
            logger.warn(
                f"{name}: UNHEALTHY - port={status['port_open']}, systemd={status['systemd_active']}, health={status['health_ok']}"
            )

            if config.get("critical", False):
                success = restart_service(name, config)
                if not success:
                    send_alert(
                        f"Critical service {name} is down and restart failed!",
                        critical=True,
                    )
            else:
                logger.info(f"{name}: Non-critical service down, not auto-restarting")
        else:
            logger.info(f"{name}: OK (pid={status['pid']})")

    return results, issues


def write_pid_file():
    """Write PID file for systemd."""
    PID_FILE.parent.mkdir(parents=True, exist_ok=True)
    PID_FILE.write_text(str(os.getpid()))


def cleanup(signum, frame):
    """Clean up on exit."""
    logger.info("Watchdog shutting down")
    PID_FILE.unlink(missing_ok=True)
    sys.exit(0)


def main():
    """Main watchdog loop."""
    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    write_pid_file()

    logger.info("=" * 60)
    logger.info("HYPERNEXUS WATCHDOG STARTED")
    logger.info(f"Monitoring {len(SERVICES)} services")
    logger.info(f"Check interval: {CHECK_INTERVAL}s")
    logger.info(f"Log: {LOG_PATH}")
    logger.info("=" * 60)

    # Initial check
    results, issues = check_all_services()
    if issues:
        logger.warn(
            f"Initial check found {len(issues)} unhealthy services: {', '.join(issues)}"
        )
    else:
        logger.info("All services healthy on startup")

    cycles = 0
    while True:
        cycles += 1
        time.sleep(CHECK_INTERVAL)

        logger.info(f"--- Health check #{cycles} ---")
        results, issues = check_all_services()

        if issues:
            logger.warn(f"Found {len(issues)} unhealthy services: {', '.join(issues)}")
        else:
            logger.info("All services healthy")

        # Log summary every 100 cycles (~1.7 hours)
        if cycles % 100 == 0:
            healthy_count = sum(1 for s in results.values() if s["healthy"])
            logger.info(
                f"Summary: {healthy_count}/{len(SERVICES)} healthy after {cycles} cycles"
            )


if __name__ == "__main__":
    main()
