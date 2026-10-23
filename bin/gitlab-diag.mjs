// Query GitLab for the failing pipeline's jobs + the tail of a failed job log.
// Reads the token from the git remote (never prints it). node bin/gitlab-diag.mjs
import { execSync } from "child_process";

const remote = execSync("git remote get-url gitlab", { cwd: process.cwd() }).toString().trim();
const m = remote.match(/oauth2:([^@]+)@/);
const token = m ? m[1] : "";
const PROJECT = "HyperNexusLLC%2FHyperNexus";
const API = "https://gitlab.com/api/v4";

async function api(path) {
  const r = await fetch(API + path, { headers: { "PRIVATE-TOKEN": token } });
  return { status: r.status, body: await r.text() };
}

(async () => {
  // 1. pipelines for the sha
  const sha = "1dc3342665913c9e4a9bb82c8d7bf7e7cf596ff5";
  let res = await api(`/projects/${PROJECT}/pipelines?sha=${sha}&per_page=5`);
  let pipes = [];
  try { pipes = JSON.parse(res.body); } catch {}
  console.log("pipelines for sha:", JSON.stringify(pipes.map(p => ({ id: p.id, status: p.status, ref: p.ref, web: p.web_url })), null, 1));

  if (!pipes.length) {
    // fall back to latest pipeline on any ref
    res = await api(`/projects/${PROJECT}/pipelines?per_page=5`);
    try { pipes = JSON.parse(res.body); } catch {}
    console.log("latest pipelines:", JSON.stringify(pipes.map(p => ({ id: p.id, status: p.status, ref: p.ref, sha: p.sha?.slice(0,8) })), null, 1));
  }

  const p = pipes[0];
  if (!p) { console.log("NO PIPELINE FOUND; raw:", res.body.slice(0,300)); return; }

  // 2. jobs of that pipeline
  res = await api(`/projects/${PROJECT}/pipelines/${p.id}/jobs?per_page=30`);
  let jobs = [];
  try { jobs = JSON.parse(res.body); } catch {}
  console.log(`\njobs for pipeline ${p.id}:`);
  for (const j of jobs) console.log(`  [${j.status}] ${j.stage}/${j.name} id=${j.id}`);

  // 3. tail of the first failed job log
  const failed = jobs.find(j => j.status === "failed");
  if (failed) {
    console.log(`\n=== LOG TAIL: ${failed.name} (id=${failed.id}) ===`);
    res = await api(`/projects/${PROJECT}/jobs/${failed.id}/trace`);
    console.log(res.body.slice(-1800));
  }
})();
