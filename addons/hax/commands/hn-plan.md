# /hn-plan — project plans in L2 memory
Create, list, or advance a plan. Plans are L2 memories tagged `system:plan`.
- Create: `node addons/hax/hn.mjs store "Plan: <title>" "Goal: ... Steps: 1.... Status: active" "system:plan,plan:<slug>" plan`
- List: `node addons/hax/hn.mjs search "Plan:" 10`
- Advance: store a new `store` with updated Status, or `node addons/hax/hn.mjs handoff "<progress>"`.
Keep one active plan per workstream; mark superseded plans in their content.
