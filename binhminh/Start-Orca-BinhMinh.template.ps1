param(
    [switch]$Background,
    [ValidateRange(0, 65535)][int]$DebugPort = 0
)
# Launcher Orca Binh Minh. Build-Orca-BinhMinh.ps1 tao file nay tu mau o lan build dau va sua
# dong $appPath moi lan build; dung sua tay dong do.
$ErrorActionPreference = 'Stop'
$appPath = '__APP_PATH__'
$profilePath = '__PROFILE_PATH__'
if (-not (Test-Path -LiteralPath $appPath -PathType Leaf)) {
    throw "Khong tim thay ban Orca Binh Minh: $appPath"
}
# Why: a second Orca build on the same profile hands off to the running one and exits silently.
$otherBuild = Get-CimInstance Win32_Process -Filter "Name='Orca.exe'" | Where-Object {
    $_.CommandLine -like "*--user-data-dir=*$profilePath*" -and $_.ExecutablePath -ne $appPath -and
    # Why: helper processes (crashpad, renderer) can outlive a crashed main process and would block launch forever.
    $_.CommandLine -notlike '*--type=*'
} | Select-Object -First 1
if ($otherBuild) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "Mot ban Orca khac dang mo cung ho so nay:`n$($otherBuild.ExecutablePath)`n`nHay thoat han ban do (menu Orca > Quit) roi mo lai shortcut.",
        'Orca Binh Minh') | Out-Null
    exit 1
}
$env:ORCA_USER_DATA_PATH = $profilePath
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
foreach ($flag in @('ORCA_E2E_HEADLESS', 'ORCA_E2E_HEADFUL', 'ORCAD_SIDECAR')) {
    Remove-Item -LiteralPath "Env:$flag" -ErrorAction SilentlyContinue
}
if ($Background) {
    $env:ORCA_BACKGROUND_LAUNCH = '1'
} else {
    Remove-Item Env:ORCA_BACKGROUND_LAUNCH -ErrorAction SilentlyContinue
}
# Why the quotes: Start-Process joins arguments with spaces, and user folders can contain one.
$launchArguments = @("--user-data-dir=`"$profilePath`"")
if ($DebugPort -gt 0) {
    $launchArguments += @("--remote-debugging-port=$DebugPort", '--remote-debugging-address=127.0.0.1')
}
Start-Process -FilePath $appPath -ArgumentList $launchArguments `
    -WindowStyle $(if ($Background) { 'Hidden' } else { 'Normal' }) | Out-Null
