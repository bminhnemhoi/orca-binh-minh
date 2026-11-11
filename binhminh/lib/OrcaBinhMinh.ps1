# Ham dung chung cho Build-Orca-BinhMinh.ps1 (nap bang: . .\lib\OrcaBinhMinh.ps1).
# File .ps1 chi dung ASCII vi PowerShell 5.1 doc file khong BOM theo bang ma ANSI.

$OrcaBinhMinhShortcutName = "Orca B$([char]0xEC)nh Minh.lnk"

function ConvertTo-PsLiteral([string]$Text) {
    "'" + $Text.Replace("'", "''") + "'"
}

function Install-OrcaBinhMinhLauncher {
    # Lan build dau tren may moi: tao launcher tu mau, chep icon, them shortcut "Orca Binh Minh"
    # tren Desktop va Start Menu. May da co launcher thi khong goi ham nay.
    param(
        [Parameter(Mandatory)][string]$Launcher,
        [Parameter(Mandatory)][string]$Template,
        [Parameter(Mandatory)][string]$AppPath,
        [Parameter(Mandatory)][string]$ProfilePath,
        [Parameter(Mandatory)][string]$IconSource,
        [string[]]$ShortcutFolders = @(
            [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))
    )
    $dir = Split-Path $Launcher -Parent
    New-Item -ItemType Directory -Force $dir | Out-Null
    $text = (Get-Content -LiteralPath $Template -Raw).
        Replace("'__APP_PATH__'", (ConvertTo-PsLiteral $AppPath)).
        Replace("'__PROFILE_PATH__'", (ConvertTo-PsLiteral $ProfilePath))
    Set-Content -LiteralPath $Launcher $text -NoNewline -Encoding utf8
    # Why a copy: the app folder changes every build and old ones get deleted.
    $icon = Join-Path $dir 'orca-binhminh.ico'
    Copy-Item -LiteralPath $IconSource $icon -Force

    $shell = New-Object -ComObject WScript.Shell
    foreach ($folder in $ShortcutFolders) {
        New-Item -ItemType Directory -Force $folder | Out-Null
        $link = $shell.CreateShortcut((Join-Path $folder $OrcaBinhMinhShortcutName))
        $link.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        # Why Bypass: Windows client defaults to the Restricted policy, which refuses -File scripts.
        $link.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Launcher`""
        $link.WorkingDirectory = $dir
        $link.IconLocation = "$icon,0"
        $link.Save()
    }
}

function New-OrcaBinhMinhZip {
    # Nen mot ban da build de gui nguoi khac: moi thu nam trong thu muc OrcaBinhMinh\ cua zip,
    # kem cac file trong $ExtrasDir (launcher .cmd, huong dan). Bo qua *.log Chromium ghi khi chay.
    param(
        [Parameter(Mandatory)][string]$AppDir,
        [Parameter(Mandatory)][string]$ExtrasDir,
        [Parameter(Mandatory)][string]$ZipPath
    )
    Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
    if (Test-Path -LiteralPath $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
    New-Item -ItemType Directory -Force (Split-Path $ZipPath -Parent) | Out-Null
    $root = (Resolve-Path -LiteralPath $AppDir).Path.TrimEnd('\') + '\'
    $zip = [System.IO.Compression.ZipFile]::Open($ZipPath, 'Create')
    try {
        $add = {
            param($path, $entry)
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $path, $entry, 'Optimal')
        }
        foreach ($file in Get-ChildItem -LiteralPath $AppDir -Recurse -File -Force) {
            $relative = $file.FullName.Substring($root.Length)
            if ($relative -notlike '*\*' -and $file.Extension -eq '.log') { continue }
            & $add $file.FullName ('OrcaBinhMinh/' + $relative.Replace('\', '/'))
        }
        foreach ($file in Get-ChildItem -LiteralPath $ExtrasDir -File) {
            & $add $file.FullName "OrcaBinhMinh/$($file.Name)"
        }
    } finally {
        $zip.Dispose()
    }
}
