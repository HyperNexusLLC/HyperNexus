#!/usr/bin/env python3
"""HyperNexus Prime Agent installer.

Installs the HyperNexus Python skill and registers the kernel's stdio MCP
server (`hypernexus mcp`) as a Prime Agent user MCP server.

Usage:
  python install.py [--project <dir>] [--global] [--uninstall] [--check] [--no-mcp]
                    [--exe <path-to-hypernexus-binary>]

Modes:
  (default)   install the skill globally (~/.prime/agent/skills/hypernexus/)
  --project   install the skill into <dir>/.prime/agent/skills/hypernexus/
  --uninstall remove the skill and deregister the MCP server
  --check     verify installation state; exit non-zero on drift
  --no-mcp    skip MCP server registration

All writes are UTF-8 without BOM.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC_SKILL = HERE / "skills" / "hypernexus"
SKILL_NAME = "hypernexus"
MCP_SERVER = "hypernexus"

# Files copied from the source skill (everything except caches).
SKIP_NAMES = {"__pycache__", ".pytest_cache"}


def log(msg: str) -> None:
    print(f"[hypernexus-install] {msg}")


def agent_dir() -> Path:
    raw = os.environ.get("PRIME_AGENT_CODING_AGENT_DIR") or os.environ.get("PI_CODING_AGENT_DIR")
    if raw:
        return Path(raw).expanduser().resolve()
    return Path.home() / ".prime" / "agent"


def skill_dest(global_mode: bool, project: Path) -> Path:
    if global_mode:
        return agent_dir() / "skills" / SKILL_NAME
    return project / ".prime" / "agent" / "skills" / SKILL_NAME


def find_cli() -> str | None:
    exe = shutil.which("prime-agent")
    if exe:
        return exe
    candidate = Path.home() / ".local" / "share" / "prime-agent" / "prime-agent.exe"
    return str(candidate) if candidate.exists() else None


def find_kernel_exe(explicit: str | None) -> str | None:
    if explicit:
        p = Path(explicit).expanduser()
        return str(p) if p.exists() else None
    env = os.environ.get("HYPERNEXUS_EXE")
    if env and Path(env).exists():
        return env
    repo = HERE.parent.parent / "bin" / ("hypernexus.exe" if os.name == "nt" else "hypernexus")
    if repo.exists():
        return str(repo)
    return shutil.which("hypernexus")


def copy_skill(dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    def ignore(_dir: str, names: list[str]) -> list[str]:
        return [n for n in names if n in SKIP_NAMES]
    shutil.copytree(SRC_SKILL, dest, ignore=ignore)
    log(f"skill installed -> {dest}")


def remove_skill(dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
        log(f"skill removed -> {dest}")
    else:
        log(f"skill not present at {dest}")


def register_mcp(exe: str, cli: str | None) -> None:
    if cli:
        run = subprocess.run(
            [cli, "mcp", "add", MCP_SERVER, "--force", "--", exe, "mcp"],
            capture_output=True, text=True,
        )
        if run.returncode == 0:
            log(f"MCP server '{MCP_SERVER}' registered via CLI -> {exe} mcp")
            return
        log(f"CLI add failed ({run.stderr.strip() or run.stdout.strip()}); falling back to settings.json")
    write_settings_entry(exe)


def write_settings_entry(exe: str) -> None:
    settings = agent_dir() / "settings.json"
    settings.parent.mkdir(parents=True, exist_ok=True)
    data: dict = {}
    if settings.exists():
        data = json.loads(settings.read_text(encoding="utf-8"))
    servers = data.get("mcpServers") or {}
    servers[MCP_SERVER] = {"type": "stdio", "command": exe, "args": ["mcp"]}
    data["mcpServers"] = servers
    backup = settings.with_suffix(".json.hypernexus-bak")
    if settings.exists() and not backup.exists():
        shutil.copy2(settings, backup)
    settings.write_text(json.dumps(data, indent=2), encoding="utf-8")
    log(f"MCP server '{MCP_SERVER}' written to {settings}")


def deregister_mcp(cli: str | None) -> None:
    if cli:
        run = subprocess.run([cli, "mcp", "remove", MCP_SERVER], capture_output=True, text=True)
        if run.returncode == 0:
            log(f"MCP server '{MCP_SERVER}' removed via CLI")
            return
    settings = agent_dir() / "settings.json"
    if settings.exists():
        data = json.loads(settings.read_text(encoding="utf-8"))
        servers = data.get("mcpServers") or {}
        if MCP_SERVER in servers:
            del servers[MCP_SERVER]
            data["mcpServers"] = servers
            settings.write_text(json.dumps(data, indent=2), encoding="utf-8")
            log(f"MCP server '{MCP_SERVER}' removed from {settings}")


def check(dest: Path, cli: str | None) -> int:
    ok = True
    required = ["SKILL.md", "pyproject.toml", f"src/{SKILL_NAME}/__init__.py"]
    for rel in required:
        if not (dest / rel).exists():
            log(f"MISSING: {dest / rel}")
            ok = False
    if ok:
        log(f"skill complete at {dest}")
    listed = ""
    if cli:
        run = subprocess.run([cli, "mcp", "list"], capture_output=True, text=True)
        listed = run.stdout
        if MCP_SERVER in listed:
            log(f"MCP server '{MCP_SERVER}' is registered")
        else:
            log(f"MCP server '{MCP_SERVER}' NOT registered")
            ok = False
    else:
        log("prime-agent CLI not found; skipped MCP registration check")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Install the HyperNexus skill for Prime Agent")
    ap.add_argument("--project", type=str, default=None, help="project directory for a project-scoped install")
    ap.add_argument("--global", dest="global_mode", action="store_true", help="install globally (default)")
    ap.add_argument("--uninstall", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--no-mcp", action="store_true", help="skip MCP server registration")
    ap.add_argument("--exe", type=str, default=None, help="path to the hypernexus kernel binary")
    args = ap.parse_args()

    project = Path(args.project).resolve() if args.project else Path.cwd()
    dest = skill_dest(args.global_mode or not args.project, project)
    cli = find_cli()

    if args.check:
        return check(dest, cli)
    if args.uninstall:
        remove_skill(dest)
        if not args.no_mcp:
            deregister_mcp(cli)
        return 0

    copy_skill(dest)
    if not args.no_mcp:
        exe = find_kernel_exe(args.exe)
        if exe:
            register_mcp(exe, cli)
        else:
            log("hypernexus kernel binary not found; skipped MCP registration (use --exe)")
    log("done. Start a new Prime Agent session so the kernel installs the skill.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
