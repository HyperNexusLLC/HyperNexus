import { execSync } from "child_process";
const remote = execSync("git remote get-url gitlab").toString().trim();
const token = remote.match(/oauth2:([^@]+)@/)?.[1] ?? "";
const P = "HyperNexusLLC%2FHyperNexus";
const H = { "PRIVATE-TOKEN": token };
const pipes = JSON.parse(await (await fetch(`https://gitlab.com/api/v4/projects/${P}/pipelines?ref=main&per_page=3`, { headers: H })).text());
for (const p of pipes) console.log(`pipeline ${p.id} [${p.status}] sha=${p.sha?.slice(0,8)} ${p.web_url}`);
const pid = pipes[0]?.id;
if (pid) {
  const jobs = JSON.parse(await (await fetch(`https://gitlab.com/api/v4/projects/${P}/pipelines/${pid}/jobs?per_page=30`, { headers: H })).text());
  console.log(`\njobs for ${pid}:`);
  for (const j of jobs) console.log(`  [${j.status}] ${j.stage}/${j.name} runner=${j.runner?.description ?? "-"} dur=${Math.round(j.duration ?? 0)}s`);
}
