#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# AquaSync Repo Hygiene Cleanup Script
# Removes debug/fix/test artifacts from git tracking and working tree.
# Run: chmod +x cleanup-repo.sh && ./cleanup-repo.sh
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail

echo "🧹 AquaSync Repo Cleanup — Starting..."

# ── 1. Remove individual debug/fix/test files ────────────────────────
FILES_TO_REMOVE=(
    check-logs.js
    fix_fetch.js
    fix_pool_hostel.py
    fix_poolstats.js
    tester.js
    test-exact-route.ts
    test-members.ts
    test-archive.js
    test-labour.js
    revert_bad_headers.py
    safe_headers_inject.py
    script-force-white-text.py
    script-theme-text-bright.py
    script-theme-update.js
    script-theme-update.py
    invoice.html
    next-dev.log
)

echo ""
echo "📄 Removing tracked debug files..."
for f in "${FILES_TO_REMOVE[@]}"; do
    if git ls-files --error-unmatch "$f" &>/dev/null; then
        git rm -f "$f"
        echo "  ✅ git rm $f"
    elif [ -f "$f" ]; then
        rm -f "$f"
        echo "  🗑️  rm $f (untracked)"
    else
        echo "  ⏭️  $f (not found, skipping)"
    fi
done

# ── 2. Remove directories ────────────────────────────────────────────
DIRS_TO_REMOVE=(
    .planning
    .agent
    pw-extract-temp
)

echo ""
echo "📁 Removing tracked directories..."
for d in "${DIRS_TO_REMOVE[@]}"; do
    if [ -d "$d" ]; then
        git rm -rf "$d" 2>/dev/null || rm -rf "$d"
        echo "  ✅ removed $d/"
    else
        echo "  ⏭️  $d/ (not found, skipping)"
    fi
done

# ── 3. Update .gitignore ─────────────────────────────────────────────
echo ""
echo "📝 Updating .gitignore..."

# Only append lines that don't already exist
GITIGNORE_ADDITIONS=(
    ""
    "# ── Repo hygiene: permanently block debug artifacts ──────────────────"
    "*.log"
    "/*.py"
    "fix_*.js"
    "fix_*.py"
    "check-*.js"
    "tester.js"
    "/test-*.ts"
    "/test-*.js"
    "invoice.html"
    "pw-extract-temp/"
    ".planning/"
    ".agent/"
)

for line in "${GITIGNORE_ADDITIONS[@]}"; do
    if [ -z "$line" ]; then
        echo "" >> .gitignore
    elif ! grep -qxF "$line" .gitignore 2>/dev/null; then
        echo "$line" >> .gitignore
        echo "  ✅ Added: $line"
    else
        echo "  ⏭️  Already present: $line"
    fi
done

git add .gitignore

echo ""
echo "✅ Cleanup complete! Review changes with: git status"
echo "   Then commit with: git commit -m 'chore: remove debug artifacts and harden .gitignore'"
echo ""
echo "⚠️  To scrub from git history (DESTRUCTIVE — backup first):"
echo "   pip install git-filter-repo"
echo "   git filter-repo --invert-paths --path check-logs.js --path fix_fetch.js --path fix_pool_hostel.py --path fix_poolstats.js --path tester.js --path test-exact-route.ts --path test-members.ts --path revert_bad_headers.py --path safe_headers_inject.py --path script-force-white-text.py --path script-theme-text-bright.py --path script-theme-update.js --path script-theme-update.py --path invoice.html --path next-dev.log --path .planning/ --path .agent/ --path pw-extract-temp/"
