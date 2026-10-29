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
SRC_SKILLS = HERE / "skills"
SRC_COMMANDS = HERE / "commands"
SRC_HOOKS = HERE / "hooks"
SKILL_NAME = "hypernexus"
# Base skill plus one focused skill per capability family.
SKILL_DIRS = [
    "hypernexus",
    "hypernexus-memory",
    "hypernexus-l2",
    "hypernexus-mcp-routing",
    "hypernexus-agents",
    "hypernexus-status-billing",
    "hypernexus-sessions",
    "hypernexus-ops",
    "hypernexus-workflows",
]
COMMAND_FILES = [
    "hn-status.md",
    "hn-search.md",
    "hn-store.md",
    "hn-session.md",
    "hn-context.md",
    "hn-summary.md",
    "hn-tools.md",
    "hn-purge.md",
]
HOOK_FILES = ["hn-observe.py", "hn-gate.py"]
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


def skills_root(global_mode: bool, project: Path) -> Path:
    if global_mode:
        return agent_dir() / "skills"
    return project / ".prime" / "agent" / "skills"


def commands_dest(global_mode: bool, project: Path) -> Path:
    base = agent_dir() if global_mode else project / ".prime" / "agent"
    return base / "hypernexus-commands"


def hooks_dest(global_mode: bool, project: Path) -> Path:
    base = agent_dir() if global_mode else project / ".prime" / "agent"
    return base / "hypernexus-hooks"


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
    shutil.copytree(SRC_SKILLS / dest.name, dest, ignore=ignore)
    log(f"skill installed -> {dest}")


def remove_skill(dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
        log(f"skill removed -> {dest}")
    else:
        log(f"skill not present at {dest}")


def install_skills(root: Path) -> None:
    for name in SKILL_DIRS:
        copy_skill(root / name)


def remove_skills(root: Path) -> None:
    for name in SKILL_DIRS:
        remove_skill(root / name)


def install_commands(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for name in COMMAND_FILES:
        src = SRC_COMMANDS / name
        if src.exists():
            shutil.copy2(src, dest / name)
    log(f"commands installed -> {dest} (load with --prompt-template <file>)")


def remove_commands(dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
        log(f"commands removed -> {dest}")
    else:
        log(f"commands not present at {dest}")


def install_hooks(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for name in HOOK_FILES:
        src = SRC_HOOKS / name
        if src.exists():
            shutil.copy2(src, dest / name)
    log(f"hooks installed -> {dest} (no native hook API; run explicitly or from a scheduled prompt)")


def remove_hooks(dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
        log(f"hooks removed -> {dest}")
    else:
        log(f"hooks not present at {dest}")


def check_file_surface() -> bool:
    ok = True
    for name in COMMAND_FILES:
        if not (SRC_COMMANDS / name).exists():
            log(f"MISSING command: {SRC_COMMANDS / name}")
            ok = False
    for name in HOOK_FILES:
        if not (SRC_HOOKS / name).exists():
            log(f"MISSING hook: {SRC_HOOKS / name}")
            ok = False
    for extra in ["mcp.json", "meta-model.prime.json", "use-meta-model.ps1",
                  "agents/hypernexus-dispatcher.md", "schedules/hn-standup.txt"]:
        if not (HERE / extra).exists():
            log(f"MISSING: {HERE / extra}")
            ok = False
    for name in SKILL_DIRS:
        if not (SRC_SKILLS / name / "SKILL.md").exists():
            log(f"MISSING skill: {SRC_SKILLS / name / 'SKILL.md'}")
            ok = False
    if ok:
        log("file surface complete (9 skills, 8 commands, 2 hooks, mcp.json, meta wiring, agent brief, schedule)")
    return ok


def check_installed_surface(root: Path, commands: Path, hooks: Path) -> bool:
    ok = True
    for name in SKILL_DIRS:
        if not (root / name / "SKILL.md").exists():
            log(f"MISSING: {root / name / 'SKILL.md'}")
            ok = False
    for name in COMMAND_FILES:
        if not (commands / name).exists():
            log(f"MISSING: {commands / name}")
            ok = False
    for name in HOOK_FILES:
        if not (hooks / name).exists():
            log(f"MISSING: {hooks / name}")
            ok = False
    if ok:
        log(f"installed surface complete at {root}, {commands}, {hooks}")
    return ok


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
    servers[MCP_SERVER] = {"type": "stdio", "command": exe, "args": ["mcp"],
                           "env": {"HYPERNEXUS_WORKSPACE_ROOT": {"env": "HYPERNEXUS_WORKSPACE_ROOT"},
                                   "HYPERNEXUS_URL": {"env": "HYPERNEXUS_URL"}}}
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
    use_global = args.global_mode or not args.project
    skills = skills_root(use_global, project)
    commands = commands_dest(use_global, project)
    hooks = hooks_dest(use_global, project)
    dest = skill_dest(args.global_mode or not args.project, project)
    cli = find_cli()

    if args.check:
        rc = check(dest, cli)
        if not check_file_surface():
            rc = 1
        if not check_installed_surface(skills, commands, hooks):
            rc = 1
        return rc
    if args.uninstall:
        remove_skills(skills)
        remove_commands(commands)
        remove_hooks(hooks)
        if not args.no_mcp:
            deregister_mcp(cli)
        return 0

    install_skills(skills)
    install_commands(commands)
    install_hooks(hooks)
    if not args.no_mcp:
        exe = find_kernel_exe(args.exe)
        if exe:
            register_mcp(exe, cli)
        else:
            log("hypernexus kernel binary not found; skipped MCP registration (use --exe)")
    log("done. Start a new Prime Agent session so the kernel installs the skills. Commands load via --prompt-template from hypernexus-commands/; hooks run explicitly or from a scheduled prompt; schedule template in schedules/hn-standup.txt; Meta model via use-meta-model.ps1 (user-run, env reference only).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
