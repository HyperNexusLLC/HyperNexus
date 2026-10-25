import { execSync } from "child_process";
const remote = execSync("git remote get-url gitlab").toString().trim();
const token = remote.match(/oauth2:([^@]+)@/)?.[1] ?? "";
const P = "HyperNexusLLC%2FHyperNexus";
const pid = process.argv[2] || "2983711696";
const name = process.argv[3] || "build-go-linux";
const H = { "PRIVATE-TOKEN": token };
const jobs = JSON.parse(await (await fetch(`https://gitlab.com/api/v4/projects/${P}/pipelines/${pid}/jobs?per_page=30`, { headers: H })).text());
const j = jobs.find(x => x.name === name);
if (!j) { console.log("job not found:", name); process.exit(1); }
console.log(`=== ${j.name} [${j.status}] id=${j.id} ===`);
const trace = await (await fetch(`https://gitlab.com/api/v4/projects/${P}/jobs/${j.id}/trace`, { headers: H })).text();
const lines = trace.split("\n");
// print the error tail (last 40 non-empty)
const nonempty = lines.filter(l => l.trim());
console.log(nonempty.slice(-40).join("\n"));
