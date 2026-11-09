# hn-swarm: HyperNexus swarm bus for Codex GUI
Bus driver: addons/codex-gui/swarm.mjs in this repo.
Run from repo root:
node addons/codex-gui/swarm.mjs assign --worker ID --goal TEXT
node addons/codex-gui/swarm.mjs inbox --worker ID
node addons/codex-gui/swarm.mjs report --worker ID --task TID --status DONE
node addons/codex-gui/swarm.mjs watch --task TID [--timeout-ms 120000]
node addons/codex-gui/swarm.mjs roster
Kernel: http://127.0.0.1:7778 . Tags swarm plus codex-gui.
Leader assigns, then watch blocks until the worker report lands.
Workers reply DONE or BLOCKED in thread and via report.
Use parity tools only, minimal text, no shell names in tool text.
