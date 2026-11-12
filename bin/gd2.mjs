import { execSync } from "child_process";
const remote = execSync("git remote get-url gitlab").toString().trim();
const token = remote.match(/oauth2:([^@]+)@/)?.[1] ?? "";
const P = "HyperNexusLLC%2FHyperNexus";
const api = async (p) => { const r = await fetch("https://gitlab.com/api/v4"+p, { headers: { "PRIVATE-TOKEN": token } }); return JSON.parse(await r.text()); };
const jobs = await api(`/projects/${P}/pipelines/2981493215/jobs?per_page=30`);
for (const j of jobs.slice(0,4)) {
  console.log(`${j.name}: status=${j.status} reason=${j.failure_reason} runner=${j.runner?.description ?? j.runner_id ?? "none"} dur=${j.duration ?? "n/a"} queued=${j.queued_duration ?? "n/a"}s`);
}
