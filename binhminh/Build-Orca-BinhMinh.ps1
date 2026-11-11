# Build Orca Binh Minh tu source va cai thanh ban moi.
#   .\Build-Orca-BinhMinh.ps1                 build day du (typecheck + build + dong goi)
#   .\Build-Orca-BinhMinh.ps1 -SkipTypecheck
#   .\Build-Orca-BinhMinh.ps1 -Zip            them file zip de gui nguoi khac (trong dist\)
# Giu ban dang dung lam ban du phong, xoa cac ban binhminh cu hon nua.
# Mac dinh app, ho so va launcher nam trong %LOCALAPPDATA%\OrcaBinhMinh. May nao muon de cho
# khac thi tao binhminh\may-nay.ps1 (khong commit) gan lai $releases, $launcher, $profilePath
# hoac nap them bien moi truong; xem CAI-DAT.md.
param([switch]$SkipTypecheck, [switch]$Zip)
$ErrorActionPreference = 'Stop'
$source = Split-Path $PSScriptRoot -Parent
$dataRoot = Join-Path $env:LOCALAPPDATA 'OrcaBinhMinh'
$releases = Join-Path $dataRoot 'releases'
$launcher = Join-Path $dataRoot 'Start-Orca-BinhMinh.ps1'
$profilePath = Join-Path $dataRoot 'profile'
$machineConfig = Join-Path $PSScriptRoot 'may-nay.ps1'
if (Test-Path -LiteralPath $machineConfig) { . $machineConfig }
. (Join-Path $PSScriptRoot 'lib\OrcaBinhMinh.ps1')

Set-Location $source
if (git status --porcelain --untracked-files=no) {
    throw 'Source con thay doi chua commit. Hay commit truoc khi build de biet ban cai tu commit nao.'
}
$commit = git rev-parse --short HEAD
New-Item -ItemType Directory -Force $releases | Out-Null
foreach ($drive in @((Get-Item -LiteralPath $source).PSDrive, (Get-Item -LiteralPath $releases).PSDrive) |
    Sort-Object Name -Unique) {
    $freeGb = $drive.Free / 1GB
    if ($freeGb -lt 3) { throw ("O {0} chi con {1:N1} GB trong; can it nhat 3 GB." -f $drive.Name, $freeGb) }
}

$env:NODE_OPTIONS = '--max-old-space-size=6144'
# Why Continue: PowerShell 5.1 turns a native tool's stderr into errors when output is redirected,
# and pnpm/electron-builder log progress there. Failures are caught by $LASTEXITCODE instead.
$ErrorActionPreference = 'Continue'
if (-not $SkipTypecheck) { pnpm run typecheck; if ($LASTEXITCODE) { throw 'Typecheck that bai.' } }
foreach ($step in 'build:relay', 'build:cli', 'build:electron-vite', 'verify:built-skills-cli',
    'build:web-from-renderer', 'build:mobile-web', 'build:native', 'ensure:electron-runtime') {
    pnpm run $step; if ($LASTEXITCODE) { throw "Buoc $step that bai." }
}
if (Test-Path 'dist\win-unpacked') { Remove-Item 'dist\win-unpacked' -Recurse -Force }
pnpm exec electron-builder --config config/electron-builder.config.cjs --win --dir
if ($LASTEXITCODE) { throw 'Dong goi that bai.' }
$ErrorActionPreference = 'Stop'

$name = 'binhminh-{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmm'), $commit
$target = Join-Path $releases "$name\win-unpacked"
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
Move-Item 'dist\win-unpacked' $target
$appPath = Join-Path $target 'Orca.exe'

$keep = @($name)
if (Test-Path -LiteralPath $launcher) {
    # Tro launcher sang ban moi; ban dang dung truoc do tro thanh ban du phong.
    $text = Get-Content $launcher -Raw
    $pattern = "\`$appPath = '((?:[^']|'')+)'"
    $previous = [regex]::Match($text, $pattern).Groups[1].Value.Replace("''", "'")
    $text = [regex]::Replace($text, $pattern, { "`$appPath = $(ConvertTo-PsLiteral $appPath)" })
    Set-Content $launcher $text -NoNewline -Encoding utf8
    $keep += Split-Path (Split-Path (Split-Path $previous -Parent) -Parent) -Leaf
} else {
    $previous = $null
    Install-OrcaBinhMinhLauncher -Launcher $launcher -AppPath $appPath -ProfilePath $profilePath `
        -Template (Join-Path $PSScriptRoot 'Start-Orca-BinhMinh.template.ps1') `
        -IconSource (Join-Path $source 'resources\build\icon.ico')
    Write-Host "Da tao launcher $launcher va shortcut Orca Binh Minh tren Desktop, Start Menu."
}

# Why check running processes: the user may still run an older build (e.g. never restarted after
# the last install); deleting it would pull files out from under the live app.
$running = @(Get-CimInstance Win32_Process -Filter "Name='Orca.exe'" | ForEach-Object { $_.ExecutablePath })
Get-ChildItem $releases -Directory -Filter 'binhminh-*' | Where-Object { $keep -notcontains $_.Name } |
    ForEach-Object {
        $dir = $_.FullName + '\'
        if ($running | Where-Object { $_ -and $_.StartsWith($dir, [StringComparison]::OrdinalIgnoreCase) }) {
            Write-Host "Giu lai $($_.Name): Orca dang chay tu ban nay, se xoa o lan build sau."
        } else {
            Write-Host "Xoa ban cu: $($_.Name)"
            Remove-Item $_.FullName -Recurse -Force
        }
    }

if ($Zip) {
    $zipPath = Join-Path $source "dist\OrcaBinhMinh-$($name -replace '^binhminh-').zip"
    New-OrcaBinhMinhZip -AppDir $target -ExtrasDir (Join-Path $PSScriptRoot 'portable') -ZipPath $zipPath
    Write-Host "Da tao file zip de chia se: $zipPath"
}

Write-Host "Da cai $name (commit $commit)$(if ($previous) { ". Ban du phong: $previous" })"
Write-Host 'Thoat Orca (menu Orca > Quit) roi mo shortcut Orca Binh Minh.'
