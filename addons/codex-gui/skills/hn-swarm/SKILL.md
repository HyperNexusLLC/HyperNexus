# hn-swarm HyperNexus swarm bus for Codex GUI 
  
Bus driver: addons/codex-gui/swarm.mjs in this repo.  
  
Run from repo root: 
node addons/codex-gui/swarm.mjs roster  
node addons/codex-gui/swarm.mjs inbox --worker ID  
node addons/codex-gui/swarm.mjs report --worker ID --task TID --status DONE 
Kernel: http://127.0.0.1:7778 . Tags swarm plus codex-gui.  
Leader fans out via thread messages, workers reply DONE or BLOCKED in thread.  
Use parity tools only, minimal text, no shell names in tool text. 
