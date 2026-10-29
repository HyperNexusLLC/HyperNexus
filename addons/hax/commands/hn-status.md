# /hn-status — HyperNexus kernel health + memory/mesh snapshot
Run `node addons/hax/hn.mjs status` and report: kernel ok/version/uptime, L2 count,
mesh peers, cold-archive count. If `"ok": false`, state plainly that the kernel is down
(Truth Pass) and continue from local files only.
