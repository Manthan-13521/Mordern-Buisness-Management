#!/bin/bash
# Comprehensive test runner — runs ALL test suites
set -o pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

PASSED=0
FAILED=0
TOTAL_TESTS=0
TOTAL_FILES=0
FAILED_FILES=""

TEST_FILES=(
  "tests/api/pool/pool.test.ts"
  "tests/api/members/members.test.ts"
  "tests/api/hostel/hostel.test.ts"
  "tests/api/auth/auth.test.ts"
  "tests/api/payments/payments.test.ts"
  "tests/api/business/business.test.ts"
  "tests/api/superadmin/superadmin.test.ts"
  "tests/api/analytics/analytics.test.ts"
  "tests/api/edge/edge.test.ts"
  "tests/api/entry/entry.test.ts"
  "tests/api/multi-tenant/multi-tenant.test.ts"
  "tests/api/business-flow/business-flow.test.ts"
  "tests/api/coverage/health-coverage.test.ts"
  "tests/api/coverage/analytics-extended-coverage.test.ts"
  "tests/api/coverage/notifications-coverage.test.ts"
  "tests/api/coverage/staff-coverage.test.ts"
  "tests/api/coverage/plans-coverage.test.ts"
  "tests/api/coverage/settings-coverage.test.ts"
  "tests/api/coverage/razorpay-subscription-coverage.test.ts"
  "tests/api/coverage/superadmin-extended-coverage.test.ts"
  "tests/api/coverage/remaining-coverage.test.ts"
  "tests/api/coverage/payments-coverage.test.ts"
)

echo "============================================================"
echo "  AquaSync Test Runner"
echo "  $(date)"
echo "============================================================"
echo ""

for FILE in "${TEST_FILES[@]}"; do
  if [ ! -f "$FILE" ]; then
    echo "  [SKIP] $FILE (not found)"
    continue
  fi
  ((TOTAL_FILES++))
  echo ""
  echo "  Running: $FILE"
  echo "  -----------------------------------------"
  
  OUTPUT=$(npx --no-install tsx "$FILE" 2>&1)
  EXIT_CODE=$?
  
  # Extract test results — format: "Results: X/Y passed (Z failed)"
  # FILE_TOTAL = Y (second number), FILE_FAILED = Z
  RESULTS_LINE=$(echo "$OUTPUT" | grep -oE 'Results: [0-9]+/[0-9]+ passed \([0-9]+ failed\)' | tail -1)
  if [ -z "$RESULTS_LINE" ]; then
    # Try simpler format without failed count: "Results: X/Y passed"
    RESULTS_LINE=$(echo "$OUTPUT" | grep -oE 'Results: [0-9]+/[0-9]+ passed' | tail -1)
  fi

  FILE_TOTAL=$(echo "$RESULTS_LINE" | grep -oE '[0-9]+/[0-9]+' | grep -oE '[0-9]+$')
  FILE_FAILED=$(echo "$RESULTS_LINE" | grep -oE '\([0-9]+ failed\)' | grep -oE '[0-9]+')
  [ -z "$FILE_FAILED" ] && FILE_FAILED="0"

  if [ -n "$FILE_TOTAL" ]; then
    TOTAL_TESTS=$((TOTAL_TESTS + FILE_TOTAL))
    if [ "$FILE_FAILED" = "0" ]; then
      PASSED=$((PASSED + FILE_TOTAL))
      echo "  \u2705 PASS ($FILE_TOTAL tests)"
    else
      FAILED=$((FAILED + FILE_FAILED))
      FAILED_FILES="$FAILED_FILES\n    \u274c $FILE ($FILE_FAILED failures)"
      echo "$OUTPUT" | tail -30
    fi
  else
    echo "$OUTPUT" | tail -30
    FAILED_FILES="$FAILED_FILES\n    \u274c $FILE (unknown result)"
  fi
done

echo ""
echo "============================================================"
echo "  FINAL SUMMARY"
echo "============================================================"
echo "  Files:    $TOTAL_FILES"
echo "  Tests:    $TOTAL_TESTS total"
echo "  Passed:   $PASSED"
echo "  Failed:   $FAILED"

if [ -n "$FAILED_FILES" ]; then
  echo ""
  echo "  Failed files:"
  echo -e "$FAILED_FILES"
  exit 1
else
  echo ""
  echo "  \u2705 ALL TESTS PASSED"
  exit 0
fi
