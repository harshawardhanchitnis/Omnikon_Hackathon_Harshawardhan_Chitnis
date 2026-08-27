$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

Write-Host '== Product Release static checks ==' -ForegroundColor Cyan
$required = @(
  'src\pages\ProductHomePage.tsx',
  'src\pages\ProductLibraryPage.tsx',
  'src\pages\MyTextbooksPage.tsx',
  'src\pages\PrivateTextbookGeneratePage.tsx',
  'src\pages\ProductLessonPage.tsx',
  'supabase\functions\ingest-private-textbook\index.ts',
  'supabase\functions\generate-private-textbook-lesson\index.ts',
  'supabase\migrations\202608270001_product_release.sql'
)
foreach ($file in $required) {
  if (-not (Test-Path $file)) { throw "Missing $file" }
}

Select-String -Path 'src\App.tsx' -Pattern 'CHALKBOX_PRODUCT_RELEASE_ROUTES' | Out-Null
Select-String -Path 'src\pages\LoginPage.tsx' -Pattern "navigate\('/app'" | Out-Null

git diff --check
pnpm exec tsc --noEmit
pnpm build

Write-Host 'Local product-release compile checks passed.' -ForegroundColor Green
