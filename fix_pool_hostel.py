import os
import re

directories_frontend = ["app/hostel", "app/pool"]
directories_api = ["app/api/hostel", "app/api/pool", "app/api/pools", "app/api"]

def fix_frontend_fetch():
    modified_count = 0
    for root_dir in directories_frontend:
        if not os.path.exists(root_dir):
            continue
        for dirpath, dirnames, filenames in os.walk(root_dir):
            for file in filenames:
                if not (file.endswith(".ts") or file.endswith(".tsx")):
                    continue
                filepath = os.path.join(dirpath, file)
                
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                original = content
                
                # Replace simple fetch(url) with fetch(url, { cache: 'no-store' })
                # Looking for fetch(SOMETHING) -> ensure no comma.
                # Basic heuristic: fetch(url)
                content = re.sub(r'\bfetch\s*\(\s*([^,]+?)\s*\)', lambda m: m.group(0) if ('{' in m.group(1) or '}' in m.group(1)) else f"fetch({m.group(1)}, {{ cache: 'no-store' }})", content)

                if content != original:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(content)
                    modified_count += 1
                    print(f"Modified fetch: {filepath}")

    print(f"Frontend modifications: {modified_count}")

def fix_backend_api():
    modified_count = 0
    # Files to ignore (e.g. auth, cron, etc)
    ignore_paths = ['app/api/auth', 'app/api/cron', 'app/api/business', 'app/api/superadmin']

    for root_dir in directories_api:
        if not os.path.exists(root_dir):
            continue
        for dirpath, dirnames, filenames in os.walk(root_dir):
            skip = False
            for ign in ignore_paths:
                if ign in dirpath.replace('\\', '/'):
                    skip = True
            if skip:
                continue

            for file in filenames:
                if file != "route.ts":
                    continue
                filepath = os.path.join(dirpath, file)
                
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                original = content

                # 1. Check for export const dynamic = "force-dynamic";
                if "export const dynamic" not in content and "GET" in content:
                    # insert after imports
                    content = re.sub(
                        r'(import\s+.*?\n)(?!import)', 
                        r'\1\nexport const dynamic = "force-dynamic";\nexport const revalidate = 0;\n', 
                        content, 
                        count=1, 
                        flags=re.DOTALL
                    )
                
                # 2. Add NextResponse.json headers
                # We look for NextResponse.json(...)
                # Simple replacement: if it's NextResponse.json(data) without a second config arg
                content = re.sub(
                    r'NextResponse\.json\(\s*([^,]+?)\s*\)', 
                    r'NextResponse.json(\1, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } })', 
                    content
                )

                if content != original:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(content)
                    modified_count += 1
                    print(f"Modified API: {filepath}")

    print(f"Backend API modifications: {modified_count}")

if __name__ == "__main__":
    fix_frontend_fetch()
    fix_backend_api()
