#!/bin/bash
# projecto — Quick dev preview (no build needed)
# Run this to preview the app in development mode

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

echo "🎬 Starting projecto in dev mode…"

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found! Please install from https://nodejs.org"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies first…"
  npm install
fi

npm start
