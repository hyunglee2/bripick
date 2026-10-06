$ErrorActionPreference = "Stop"

$server = "bobf@221.149.122.243"
$siteUrl = "https://bripick.coreluma.kr"
$archivePath = Join-Path ([System.IO.Path]::GetTempPath()) "bripick-deploy-$PID.tar.gz"
$serverEnvPath = Join-Path ([System.IO.Path]::GetTempPath()) "bripick-env-$PID"
$localEnvPath = Join-Path $PSScriptRoot "../.env.local"

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Names
    )

    foreach ($name in $Names) {
        $line = Get-Content -LiteralPath $localEnvPath | Where-Object {
            $_ -match "^\s*$([Regex]::Escape($name))\s*="
        } | Select-Object -First 1

        if ($line) {
            $value = ($line -replace "^\s*$([Regex]::Escape($name))\s*=\s*", "").Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            if ($value) { return $value }
        }
    }

    return $null
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

try {
    if (-not (Test-Path -LiteralPath $localEnvPath)) {
        throw "Missing .env.local. Supabase production environment values are required."
    }

    $supabaseUrl = Get-DotEnvValue @("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
    $supabaseKey = Get-DotEnvValue @(
        "SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    )

    if (-not $supabaseUrl -or -not $supabaseKey) {
        throw "Missing Supabase URL or publishable key in .env.local."
    }

    $serverEnv = "SUPABASE_URL=$supabaseUrl`nSUPABASE_PUBLISHABLE_KEY=$supabaseKey`n"
    [System.IO.File]::WriteAllText(
        $serverEnvPath,
        $serverEnv,
        [System.Text.UTF8Encoding]::new($false)
    )

    Write-Host "[1/4] Building Next.js standalone server..."
    Invoke-Checked { npm run build } "Next.js build failed."

    Copy-Item -Recurse -Force "public" ".next/standalone/public"
    New-Item -ItemType Directory -Force -Path ".next/standalone/.next/static" | Out-Null
    Copy-Item -Recurse -Force ".next/static/*" ".next/standalone/.next/static"

    Write-Host "[2/4] Creating deployment archive..."
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    Invoke-Checked { tar -czf $archivePath -C .next/standalone . } "Could not create the deployment archive."

    Write-Host "[3/4] Uploading and activating release..."
    $securePassword = Read-Host "SSH/sudo password for $server" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
        $env:BRIPICK_DEPLOY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        Invoke-Checked {
            node scripts/deploy-remote.mjs $archivePath $serverEnvPath
        } "Server deployment failed."
    }
    finally {
        Remove-Item Env:BRIPICK_DEPLOY_PASSWORD -ErrorAction SilentlyContinue
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }

    Write-Host "[4/4] Verifying public HTTPS endpoint..."
    Invoke-Checked { curl.exe -fSs -o NUL $siteUrl } "Public HTTPS health check failed."

    Write-Host "Deployment complete: $siteUrl"
}
finally {
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    if (Test-Path -LiteralPath $serverEnvPath) {
        Remove-Item -LiteralPath $serverEnvPath -Force
    }
}
