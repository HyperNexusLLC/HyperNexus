import os

files = [
    "apps/web/src/app/dashboard/claude-cloud/page.tsx",
    "apps/web/src/app/dashboard/copilot/page.tsx",
    "apps/web/src/app/dashboard/openai-codex/page.tsx",
    "apps/web/src/app/dashboard/blocks/page.tsx",
    "apps/web/src/app/dashboard/autopilot/page.tsx",
    "apps/web/src/app/dashboard/super-assistant/page.tsx"
]

for f_path in files:
    print(f"\n=========================================\nFile: {f_path}\n=========================================")
    if not os.path.exists(f_path):
        print("Does not exist")
        continue
    with open(f_path, "r", encoding="utf-8") as f:
        content = f.read()
    # Print first 50 lines and a summary of contents
    lines = content.splitlines()
    print("\n".join(lines[:60]))
    print(f"\n... Total lines: {len(lines)}")
