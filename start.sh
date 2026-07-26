#!/usr/bin/env bash
# Start Animal Duet: backend (optional leaderboard) + game dev server.
set -e
cd "$(dirname "$0")"

(cd backend && npm start) &
BACKEND_PID=$!
trap "kill $BACKEND_PID 2>/dev/null || true" EXIT

cd app && npm run dev
