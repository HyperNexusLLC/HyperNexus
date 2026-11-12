#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function findKernel() {
  const configured = process.env.HYPERNEXUS_BIN;
  if (configured && fs.existsSync(configured)) return configured;

  let directory = process.cwd();
  for (let depth = 0; depth < 16; depth += 1) {
    for (const name of ["hypernexus.exe", "hypernexus"]) {
      const candidate = path.join(directory, "bin", name);
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  for (const entry of (process.env.PATH || "").split(path.delimiter)) {
    for (const name of ["hypernexus.exe", "hypernexus"]) {
      const candidate = path.join(entry, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

const executable = findKernel();
if (!executable) {
  process.stderr.write(
    "[hypernexus-mcp] Kernel executable not found. Set HYPERNEXUS_BIN or add hypernexus to PATH.\n"
  );
  process.exit(1);
}

const child = spawn(executable, ["mcp"], { stdio: "inherit", windowsHide: true });
child.on("error", (error) => {
  process.stderr.write(`[hypernexus-mcp] Could not start ${executable}: ${error.message}\n`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
