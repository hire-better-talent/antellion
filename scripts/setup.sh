#!/usr/bin/env bash
set -euo pipefail

echo "Setting up Antellion..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required but not installed."; exit 1; }

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Copy env file if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — update DATABASE_URL before continuing."
else
  echo ".env already exists, skipping."
fi

echo ""
echo "Setup complete. Next steps:"
echo "  1. Update DATABASE_URL in .env"
echo "  2. Run: pnpm db:push"
echo "  3. Run: pnpm db:generate"
echo "  4. Run: pnpm dev"
