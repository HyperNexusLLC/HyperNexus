# /hn-purge — remove a memory by id
Destructive: only purge test data, duplicates, or content the user asked to forget.
1. Locate the id: `node addons/hax/hn.mjs search "<query>" 10` (ids are in `record.id` / `id`).
2. `node addons/hax/hn.mjs delete <id>` (routes through `delete_memory`, the kernel's true delete path).
3. Confirm it is gone with a second `search`. Never purge without an explicit reason.
