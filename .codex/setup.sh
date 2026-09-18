#!/usr/bin/env bash
set -euo pipefail

echo "[Bripick] Installing dependencies..."
npm ci

echo "[Bripick] Verifying production build..."
npm run build

echo "[Bripick] Setup complete."
