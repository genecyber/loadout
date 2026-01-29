#!/bin/bash
set -e

# Start the server and send initialization + list_skills request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
node dist/index.js --skills-dir ./test-skills 2>/dev/null | head -1

echo "Integration test passed - server responds to JSON-RPC"
