$ErrorActionPreference = "Stop"

$server = "bobf@221.149.122.243"
$siteUrl = "https://bripick.coreluma.kr"
$archivePath = Join-Path ([System.IO.Path]::GetTempPath()) "bripick-deploy-$PID.tar.gz"

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
    Write-Host "[1/4] Building static export..."
    Invoke-Checked { npm run build } "Next.js build failed."

    Write-Host "[2/4] Creating deployment archive..."
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    Invoke-Checked { tar -czf $archivePath -C out . } "Could not create the deployment archive."

    Write-Host "[3/4] Uploading and activating release..."
    $securePassword = Read-Host "SSH/sudo password for $server" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
        $env:BRIPICK_DEPLOY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        Invoke-Checked {
            node scripts/deploy-remote.mjs $archivePath
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
}
