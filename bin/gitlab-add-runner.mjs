import { execSync } from "child_process";
const remote = execSync("git remote get-url gitlab").toString().trim();
const token = remote.match(/oauth2:([^@]+)@/)?.[1] ?? "";
const P = "HyperNexusLLC%2FHyperNexus";
const H = { "PRIVATE-TOKEN": token, "Content-Type": "application/json" };
const proj = JSON.parse(await (await fetch(`https://gitlab.com/api/v4/projects/${P}`, { headers: H })).text());
console.log("project id:", proj.id, "| access:", proj.permissions?.project_access?.access_level ?? "?");
const r = await fetch(`https://gitlab.com/api/v4/user/runners`, {
  method: "POST", headers: H,
  body: JSON.stringify({ runner_type: "project_type", project_id: proj.id, description: "hetzner-self-hosted", tag_list: "hetzner,self-hosted,linux", run_untagged: true, locked: false }),
});
const j = JSON.parse(await r.text());
console.log("HTTP", r.status, JSON.stringify(j).slice(0, 300));
if (j.token || j.authentication_token) console.log("TOKEN=" + (j.token || j.authentication_token), "ID=" + j.id);
