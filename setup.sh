#!/bin/bash
# WatchTower Web - One-step setup
# Usage: ./setup.sh

set -e

echo "==> Installing dependencies..."
npm install

echo "==> Setting up database..."
npx prisma db push

echo "==> Setup complete!"
echo ""
echo "To start the app:  npm run dev:all"
echo "  (starts Next.js + background worker)"
echo ""
echo "Or run separately:"
echo "  npm run dev        # Next.js only"
echo "  npm run dev:worker # Worker only"
