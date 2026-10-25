import { execSync } from "child_process";
const remote = execSync("git remote get-url gitlab").toString().trim();
const token = remote.match(/oauth2:([^@]+)@/)?.[1] ?? "";
const P = "HyperNexusLLC%2FHyperNexus";
const H = { "PRIVATE-TOKEN": token, "Content-Type": "application/json" };
const r = await fetch(`https://gitlab.com/api/v4/projects/${P}/pipeline`, {
  method: "POST", headers: H, body: JSON.stringify({ ref: "main" }),
});
const j = JSON.parse(await r.text());
console.log("HTTP", r.status, "| pipeline", j.id, "|", j.status, "|", j.web_url ?? JSON.stringify(j).slice(0,150));
