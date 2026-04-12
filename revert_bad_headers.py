import os
import re

bad_pattern = ', { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }'

files = [
    "app/api/payments/route.ts",
    "app/api/seed/route.ts",
    "app/api/pools/subscribe/route.ts",
    "app/api/entertainment-members/route.ts",
    "app/api/plans/route.ts",
    "app/api/plans/[id]/route.ts",
    "app/api/entry/route.ts",
    "app/api/hostel/blocks/route.ts",
    "app/api/hostel/settings/route.ts",
    "app/api/hostel/plans/route.ts",
    "app/api/hostel/plans/[id]/route.ts",
    "app/api/hostel/hostel-settings/route.ts",
    "app/api/hostel/members/route.ts",
    "app/api/hostel/members/[id]/route.ts",
    "app/api/hostel/staff/attendance/route.ts",
    "app/api/hostel/staff/[id]/route.ts",
    "app/api/hostel/rooms/route.ts",
    "app/api/hostel/analytics/monthly-income/route.ts",
    "app/api/hostel/analytics/monthly-checkouts/route.ts",
    "app/api/hostel/analytics/monthly-members/route.ts",
    "app/api/competitions/[id]/route.ts",
    "app/api/subscription/webhook/route.ts",
    "app/api/subscription/create-order/route.ts",
    "app/api/super-admin/pools/route.ts",
    "app/api/workers/process-notification/route.ts",
    "app/api/members/route.ts",
    "app/api/members/[id]/route.ts",
    "app/api/members/[id]/permanent/route.ts",
    "app/api/razorpay/create-order/route.ts",
    "app/api/backups/download/route.ts",
    "app/api/backups/list/route.ts",
    "app/api/warmup/route.ts",
    "app/api/analytics/monthly-income/route.ts",
    "app/api/analytics/weekly-members/route.ts",
    "app/api/analytics/weekly-income/route.ts",
    "app/api/analytics/daily-members/route.ts",
    "app/api/analytics/monthly-members/route.ts",
    "app/api/twilio/connect/route.ts"
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Remove the bad pattern
    new_content = content.replace(bad_pattern, "")
    
    # Also cleanup doubled braces if any, though the pattern above usually covers it
    # We should be careful not to remove valid headers if they existed before (unlikely given the specific string)
    
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Reverted: {filepath}")

