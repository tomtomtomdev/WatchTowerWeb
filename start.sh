#!/bin/bash
# WatchTower Web - One-step start
# Usage: ./start.sh

set -e

# Auto-setup if node_modules or database doesn't exist
if [ ! -d "node_modules" ] || [ ! -f "prisma/dev.db" ]; then
  echo "==> First run detected, running setup..."
  npm install
  npx prisma db push
fi

echo "==> Starting WatchTower Web..."
npm run dev:all
