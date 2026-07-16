#!/bin/bash
npm start &
SERVER_PID=$!
sleep 5
echo "Running tests..."
./tests/run-all.sh
kill $SERVER_PID
