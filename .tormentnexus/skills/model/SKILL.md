---
name: model
description: Inspect or change Babysitter model-routing policy by phase.
source: ~\.a5c\process-library\babysitter-repo\plugins\babysitter-codex\skills\model\SKILL.md
category: process-library
date: 2026-06-14T07:33:34.243144

---



# model

Load and use the installed `babysit` skill.

Resolve the request in `model` mode:

- treat everything after `$model` as the model-routing request
- focus on showing, clearing, or setting model-routing policy by phase
- do not create a separate command surface here; this skill only forwards into
  `babysit`
