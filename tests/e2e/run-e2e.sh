#!/bin/bash

set -e

echo "Starting server in background..."
pnpm dev > /tmp/wrangler-e2e.log 2>&1 &
WRANGLER_PID=$!

echo "Waiting for server to start..."
sleep 8

PORT=$(grep -oP "Ready on http://localhost:\K\d+" /tmp/wrangler-e2e.log | tail -1)

if [ -z "$PORT" ]; then
    echo "ERROR: Could not detect server port"
    pkill -f "wrangler dev" || true
    exit 1
fi

echo "Server detected on port: $PORT"
echo "Running e2e tests..."
echo ""

SERVER_URL="http://localhost:$PORT" pnpm tsx tests/e2e/test-server.ts
EXIT_CODE=$?

echo ""
echo "Cleaning up..."
pkill -f "wrangler dev" || true

exit $EXIT_CODE

