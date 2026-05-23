# GrowBase - Cleanup script
# Spusti v PowerShell: .\cleanup.ps1
# Adresar: C:\Users\Jozef Polomsky\Desktop\GrowBase\growbasemanager

$ErrorActionPreference = "Stop"
$projectDir = "C:\Users\Jozef Polomský\Desktop\GrowBase\growbasemanager"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "GrowBase - Cleanup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

Set-Location $projectDir
Write-Host ""
Write-Host "Pracovny adresar: $projectDir" -ForegroundColor Yellow

# ============================================================
# 1. Zmaz nepouzivane subory
# ============================================================
Write-Host ""
Write-Host "[1/5] Mazanie nepouzivanych suborov..." -ForegroundColor Cyan

$filesToDelete = @(
    "src\pages\CalendarPage.tsx",
    "src\components\PackagingMappings.tsx"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        git rm $file
        Write-Host "  [OK] Zmazane: $file" -ForegroundColor Green
    } else {
        Write-Host "  [--] Neexistuje: $file (preskakujem)" -ForegroundColor Gray
    }
}

# ============================================================
# 2. Odstranenie console.debug a console.info z .ts a .tsx suborov
# ============================================================
Write-Host ""
Write-Host "[2/5] Odstranenie console.debug a console.info logov..." -ForegroundColor Cyan

$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx" -File
$totalRemoved = 0
$filesChanged = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($null -eq $content) { continue }

    $originalContent = $content

    # Vzor: jednoriadkove console.debug(...) a console.info(...)
    # Maze cely riadok aj s odsadenim + newline
    $pattern = '(?m)^[ \t]*console\.(debug|info)\s*\([^)]*\)\s*;?\s*\r?\n'
    $content = [regex]::Replace($content, $pattern, '')

    # Druhy prechod: multiline console.debug/.info volania
    $multilinePattern = '(?ms)^[ \t]*console\.(debug|info)\s*\([^)]*?\)\s*;?\s*\r?\n'
    $content = [regex]::Replace($content, $multilinePattern, '')

    if ($content -ne $originalContent) {
        $beforeCount = ([regex]::Matches($originalContent, 'console\.(debug|info)\s*\(')).Count
        $afterCount = ([regex]::Matches($content, 'console\.(debug|info)\s*\(')).Count
        $removed = $beforeCount - $afterCount

        if ($removed -gt 0) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            $relativePath = $file.FullName.Replace($projectDir, '').TrimStart('\')
            Write-Host "  [OK] $relativePath ($removed odstranenych)" -ForegroundColor Green
            $totalRemoved += $removed
            $filesChanged++
        }
    }
}

Write-Host "  Spolu odstranenych: $totalRemoved logov v $filesChanged suboroch" -ForegroundColor Yellow

# Overenie - ci zostali nejake
$remaining = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($null -eq $content) { continue }
    $remainingMatches = [regex]::Matches($content, 'console\.(debug|info)\s*\(')
    $remaining += $remainingMatches.Count
}
if ($remaining -gt 0) {
    Write-Host "  [!!] Zostava $remaining console.debug/info (skontroluj manualne)" -ForegroundColor Yellow
} else {
    Write-Host "  [OK] Ziadne console.debug/info nezostalo" -ForegroundColor Green
}

# ============================================================
# 3. Zmazanie zalohovych suborov
# ============================================================
Write-Host ""
Write-Host "[3/5] Hladanie a mazanie zaloh (*.backup, *.old, *.bak)..." -ForegroundColor Cyan

$backupPatterns = @("*.backup", "*.old", "*.bak", "*~")
$backupsFound = 0

foreach ($pattern in $backupPatterns) {
    $backups = Get-ChildItem -Path "src" -Recurse -Include $pattern -File -ErrorAction SilentlyContinue
    foreach ($backup in $backups) {
        $relativePath = $backup.FullName.Replace($projectDir, '').TrimStart('\')
        # Skus cez git rm (ak je tracked), inak Remove-Item
        & git ls-files --error-unmatch $relativePath 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            git rm $relativePath
            Write-Host "  [OK] Zmazane z gitu: $relativePath" -ForegroundColor Green
        } else {
            Remove-Item $backup.FullName -Force
            Write-Host "  [OK] Zmazane (untracked): $relativePath" -ForegroundColor Green
        }
        $backupsFound++
    }
}

if ($backupsFound -eq 0) {
    Write-Host "  [--] Ziadne zalohove subory nenajdene" -ForegroundColor Gray
}

# ============================================================
# 4. TypeScript validacia
# ============================================================
Write-Host ""
Write-Host "[4/5] TypeScript validacia (npx tsc --noEmit)..." -ForegroundColor Cyan
Write-Host "  (moze to chvilu trvat)" -ForegroundColor Gray

$tscOutput = & npx tsc --noEmit 2>&1
$tscExitCode = $LASTEXITCODE

if ($tscExitCode -eq 0) {
    Write-Host "  [OK] TypeScript OK - ziadne chyby" -ForegroundColor Green
} else {
    Write-Host "  [!!] TypeScript chyby - zastavujem pred git push:" -ForegroundColor Red
    Write-Host $tscOutput -ForegroundColor Red
    Write-Host ""
    Write-Host "Oprav chyby a spusti znova." -ForegroundColor Yellow
    exit 1
}

# ============================================================
# 5. Git commit + push
# ============================================================
Write-Host ""
Write-Host "[5/5] Git commit + push..." -ForegroundColor Cyan

$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "  [--] Ziadne zmeny na commit" -ForegroundColor Gray
    exit 0
}

git add -A
git commit -m "Upratovanie: zmazanie starych suborov, odstranenie console.debug/info logov"
$commitExit = $LASTEXITCODE

if ($commitExit -ne 0) {
    Write-Host "  [!!] Commit zlyhal" -ForegroundColor Red
    exit 1
}

git push
$pushExit = $LASTEXITCODE

if ($pushExit -eq 0) {
    Write-Host "  [OK] Push uspesny" -ForegroundColor Green
} else {
    Write-Host "  [!!] Push zlyhal" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "HOTOVO" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
