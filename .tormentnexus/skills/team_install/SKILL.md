---
name: team-install
description: Install the team-pinned Babysitter Codex workspace setup.
source: ~\.a5c\process-library\babysitter-repo\plugins\babysitter-codex\skills\team-install\SKILL.md
category: process-library
date: 2026-06-14T07:33:34.266833

---



# team-install

Load and use the installed `babysit` skill.

Resolve the request in `team-install` mode:

- treat everything after `$team-install` as team-install arguments or intent
- focus on shared workspace setup and team-pinned configuration
- do not create a separate command surface here; this skill only forwards into
  `babysit`
