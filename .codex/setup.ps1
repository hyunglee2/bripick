$ErrorActionPreference = "Stop"

Write-Host "[Bripick] Installing dependencies..."
npm ci

Write-Host "[Bripick] Verifying production build..."
npm run build

Write-Host "[Bripick] Setup complete."
