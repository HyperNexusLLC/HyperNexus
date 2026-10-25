import { execSync } from "child_process";
const remote = execSync("git remote get-url gitlab").toString().trim();
const token = remote.match(/oauth2:([^@]+)@/)?.[1] ?? "";
const H = { "PRIVATE-TOKEN": token };
const j = JSON.parse(await (await fetch("https://gitlab.com/api/v4/runners/57811716", { headers: H })).text());
console.log("runner", j.id, "| status:", j.status, "| online:", j.online, "| paused:", j.paused, "| tags:", JSON.stringify(j.tag_list), "| run_untagged:", j.run_untagged);
