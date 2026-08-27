$ErrorActionPreference = "Stop"

function Invoke-P0Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host ""
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

Invoke-P0Step "Git whitespace check" { git diff --check }
Invoke-P0Step "TypeScript" { pnpm exec tsc --noEmit }
Invoke-P0Step "Production build" { pnpm build }
Invoke-P0Step "Production config" { node .\scripts\p0-production-config-check.mjs }
Invoke-P0Step "Secret scan" { node .\scripts\p0-secret-scan.mjs }

$rlsVars = @(
    "P0_SUPABASE_URL",
    "P0_SUPABASE_PUBLISHABLE_KEY",
    "P0_USER_A_EMAIL",
    "P0_USER_A_PASSWORD",
    "P0_USER_B_EMAIL",
    "P0_USER_B_PASSWORD"
)
$haveRlsVars = $true
foreach ($name in $rlsVars) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        $haveRlsVars = $false
    }
}

if ($haveRlsVars) {
    Invoke-P0Step "Cross-account RLS/storage test" { node .\scripts\p0-rls-cross-account-test.mjs }
} else {
    Write-Host ""
    Write-Host "SKIP - Cross-account RLS test (set the six P0_USER/P0_SUPABASE environment variables first)." -ForegroundColor Yellow
}

if ($haveRlsVars -and $env:P0_RUN_LIVE_AI -eq "1") {
    Invoke-P0Step "Scanned PDF -> private RAG -> lesson" { node .\scripts\p0-scanned-rag-smoke.mjs }
} else {
    Write-Host "SKIP - Scanned-PDF live RAG smoke (set P0_RUN_LIVE_AI=1 plus P0 account variables when ready to consume live AI calls)." -ForegroundColor Yellow
}

if (-not [string]::IsNullOrWhiteSpace($env:P0_APP_URL)) {
    Invoke-P0Step "Hosted Cloudflare smoke" { node .\scripts\p0-hosted-smoke.mjs }
} else {
    Write-Host "SKIP - Hosted smoke (set P0_APP_URL after Cloudflare deployment)." -ForegroundColor Yellow
}

if (
    -not [string]::IsNullOrWhiteSpace($env:P0_SMTP_TEST_EMAIL) -and
    -not [string]::IsNullOrWhiteSpace($env:P0_APP_URL) -and
    -not [string]::IsNullOrWhiteSpace($env:P0_SUPABASE_URL) -and
    -not [string]::IsNullOrWhiteSpace($env:P0_SUPABASE_PUBLISHABLE_KEY)
) {
    Invoke-P0Step "SMTP recovery smoke" { node .\scripts\p0-smtp-recovery-smoke.mjs }
} else {
    Write-Host "SKIP - SMTP smoke (set P0_SMTP_TEST_EMAIL plus P0_APP_URL/P0_SUPABASE_* after custom SMTP is configured)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "P0 LOCAL PREFLIGHT COMPLETE." -ForegroundColor Green
Write-Host "Next deployment gates: Supabase migration dry-run/push, redeploy the two private-textbook functions, configure Custom SMTP/Auth URLs, deploy Cloudflare, then rerun this script with the P0 environment variables set."
