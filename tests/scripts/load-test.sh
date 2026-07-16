#!/bin/bash
# Phase 12 - Production Load Testing Script
# Execute this against the staging or production environment.

echo "==================================================="
echo " AquaSync Production Load Validation (autocannon)  "
echo "==================================================="

# Default to localhost if not specified
TARGET_URL=${1:-"http://localhost:3000"}

# Check if autocannon is installed globally, else run via npx
if ! command -v autocannon &> /dev/null
then
    echo "autocannon could not be found, using npx autocannon..."
    CMD="npx autocannon"
else
    CMD="autocannon"
fi

echo -e "\n[1] Testing Public Homepage (Static/SSG performance)"
$CMD -c 100 -d 10 -p 10 "$TARGET_URL/"

echo -e "\n[2] Testing Public Login Route (SSR)"
$CMD -c 50 -d 10 -p 10 "$TARGET_URL/login"

echo -e "\n[3] Testing API: Health Check (JSON)"
$CMD -c 200 -d 10 -p 10 "$TARGET_URL/api/health/ready"

echo -e "\nLoad testing complete."
echo "If any P99 latency exceeds 200ms for static routes, or 800ms for API routes, investigate."
