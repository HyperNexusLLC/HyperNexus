import os
import glob

dashboard_dir = "apps/web/src/app/dashboard"
subdirs = [d for d in os.listdir(dashboard_dir) if os.path.isdir(os.path.join(dashboard_dir, d))]
print(f"Total subdirectories: {len(subdirs)}")

for subdir in sorted(subdirs):
    page_path = os.path.join(dashboard_dir, subdir, "page.tsx")
    if os.path.exists(page_path):
        size = os.path.getsize(page_path)
        print(f"  {subdir}/page.tsx: {size} bytes")
        # Read the first few lines to get a description
        with open(page_path, "r", encoding="utf-8") as f:
            lines = [f.readline().strip() for _ in range(15)]
        print(f"    Lines 1-10: {lines[:10]}")
    else:
        print(f"  {subdir} - No page.tsx found")
