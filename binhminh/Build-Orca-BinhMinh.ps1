# Build Orca Binh Minh tu source va cai thanh ban moi.
#   .\Build-Orca-BinhMinh.ps1            build day du (typecheck + build + dong goi)
#   .\Build-Orca-BinhMinh.ps1 -SkipTypecheck
# Giu ban dang dung lam ban du phong, xoa cac ban binhminh cu hon nua.
param([switch]$SkipTypecheck)
$ErrorActionPreference = 'Stop'
$source = 'D:\Brainstorm_Idea\orca_bminh\orca'
$releases = 'D:\orca-local\releases'
$launcher = 'D:\Brainstorm_Idea\orca_bminh\Start-Orca-BinhMinh.ps1'

. 'D:\orca-local\environment.ps1'
Set-Location $source
if (git status --porcelain --untracked-files=no) {
    throw 'Source con thay doi chua commit. Hay commit truoc khi build de biet ban cai tu commit nao.'
}
$commit = git rev-parse --short HEAD
$freeGb = (Get-PSDrive D).Free / 1GB
if ($freeGb -lt 3) { throw ("O D chi con {0:N1} GB trong; can it nhat 3 GB." -f $freeGb) }

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

# Tro launcher sang ban moi; ban dang dung truoc do tro thanh ban du phong.
$text = Get-Content $launcher -Raw
$previous = [regex]::Match($text, "\`$appPath = '([^']+)'").Groups[1].Value
$text = $text -replace "\`$appPath = '[^']+'", "`$appPath = '$target\Orca.exe'"
Set-Content $launcher $text -NoNewline -Encoding utf8

$previousName = Split-Path (Split-Path (Split-Path $previous -Parent) -Parent) -Leaf
$keep = @($name, $previousName)
Get-ChildItem $releases -Directory -Filter 'binhminh-*' | Where-Object { $keep -notcontains $_.Name } |
    ForEach-Object { Write-Host "Xoa ban cu: $($_.Name)"; Remove-Item $_.FullName -Recurse -Force }

Write-Host "Da cai $name (commit $commit). Ban du phong: $previous"
Write-Host 'Thoat Orca (menu Orca > Quit) roi mo shortcut Orca Binh Minh.'
