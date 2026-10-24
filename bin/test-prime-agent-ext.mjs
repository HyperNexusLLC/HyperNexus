#!/usr/bin/env node
// HyperNexus Prime Agent extension battery wrapper.
// Runs addons/prime-agent/tests/test_prime_agent_ext.py with the first available Python.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")), "..");
const script = path.join(root, "addons", "prime-agent", "tests", "test_prime_agent_ext.py");

const candidates = [
  path.join(os.homedir(), ".prime", "agent", "kernel-venv", "Scripts", "python.exe"),
  path.join(os.homedir(), ".prime", "agent", "kernel-venv", "bin", "python"),
  "python3",
  "python",
];
const py = candidates.find((c) => c === "python3" || c === "python" || existsSync(c));

const run = spawnSync(py, [script, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(run.status ?? 1);
