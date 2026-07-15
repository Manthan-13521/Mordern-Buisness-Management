#!/bin/bash
# Continuous validation runner — cycles through all test suites repeatedly
set -o pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

LOG_DIR="tests/continuous-logs"
mkdir -p "$LOG_DIR"

CYCLE=1
MAX_CYCLES=${1:-60}  # Default ~2 hours (60 cycles × ~2 min each)
START_TIME=$(date +%s)
END_TIME=$((START_TIME + 7200))  # 2 hours

TEST_FILES=(
  # Original suites
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
  # Coverage tests
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
  # Deep coverage tests
  "tests/api/coverage/member-deep-coverage.test.ts"
  "tests/api/coverage/entry-entry-coverage.test.ts"
  "tests/api/coverage/pool-staff-coverage.test.ts"
  "tests/api/coverage/hostel-members-coverage.test.ts"
  "tests/api/coverage/remaining-deep-coverage.test.ts"
)

TOTAL_FILES=${#TEST_FILES[@]}
ALL_PASSED=true
PASS_COUNT=0
FAIL_COUNT=0
CYCLE_PASSES=0
CYCLE_FAILS=0

echo "============================================================"
echo "  AquaSync Continuous Validation"
echo "  Started: $(date)"
echo "  Max cycles: $MAX_CYCLES"
echo "  Test files: $TOTAL_FILES"
echo "============================================================"
echo ""

while [ $CYCLE -le $MAX_CYCLES ]; do
  NOW=$(date +%s)
  if [ $NOW -ge $END_TIME ]; then
    echo "  Time budget (2h) exhausted at cycle $CYCLE."
    break
  fi

  CYCLE_START=$(date +%s)
  CYCLE_LOG="$LOG_DIR/cycle-$(printf "%03d" $CYCLE).log"
  CYCLE_PASSED=0
  CYCLE_FAILED=0
  
  echo "[Cycle $CYCLE] $(date) — Running $TOTAL_FILES test files..."
  
  for FILE in "${TEST_FILES[@]}"; do
    OUTPUT=$(npx --no-install tsx "$FILE" 2>&1)
    EXIT_CODE=$?
    
    # Parse result
    RESULT_LINE=$(echo "$OUTPUT" | grep -oE '[0-9]+/[0-9]+ passed' | tail -1)
    TEST_PASSED=$(echo "$RESULT_LINE" | cut -d'/' -f1)
    TEST_TOTAL=$(echo "$RESULT_LINE" | cut -d'/' -f2 | cut -d' ' -f1)
    
    if [ "$EXIT_CODE" = "0" ]; then
      echo "  [PASS] $FILE ($TEST_PASSED/$TEST_TOTAL)"
      ((CYCLE_PASSED += TEST_TOTAL))
      ((PASS_COUNT++))
    else
      FAILURE_INFO=$(echo "$OUTPUT" | grep "❌" | head -3)
      echo "  [FAIL] $FILE — $FAILURE_INFO"
      ((CYCLE_FAILED += TEST_TOTAL))
      ((FAIL_COUNT++))
      ALL_PASSED=false
    fi
  done
  
  CYCLE_END=$(date +%s)
  CYCLE_DURATION=$((CYCLE_END - CYCLE_START))
  
  echo "[Cycle $CYCLE complete] ${CYCLE_PASSED}p / ${CYCLE_FAILED}f in ${CYCLE_DURATION}s"
  echo "[Cycle $CYCLE] $(date)" > "$CYCLE_LOG"
  echo "  Passed: $CYCLE_PASSED" >> "$CYCLE_LOG"
  echo "  Failed: $CYCLE_FAILED" >> "$CYCLE_LOG"
  echo "  Duration: ${CYCLE_DURATION}s" >> "$CYCLE_LOG"
  
  if [ "$CYCLE_FAILED" = "0" ]; then
    ((CYCLE_PASSES++))
  else
    ((CYCLE_FAILS++))
  fi
  
  ((CYCLE++))
done

TOTAL_DURATION=$(( $(date +%s) - START_TIME ))
echo ""
echo "============================================================"
echo "  Continuous Validation Complete"
echo "  Duration: ${TOTAL_DURATION}s"
echo "  Cycles: $((CYCLE - 1))"
echo "  Clean passes: $CYCLE_PASSES"
echo "  Cycles with failures: $CYCLE_FAILS"
echo "============================================================"
