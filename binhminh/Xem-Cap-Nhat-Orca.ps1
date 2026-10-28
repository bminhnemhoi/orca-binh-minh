# Xem cac repo khac co gi moi so voi ban Orca Binh Minh (chi doc, khong thay doi source).
#   .\Xem-Cap-Nhat-Orca.ps1                 xem origin (Orca goc) va lamng
#   .\Xem-Cap-Nhat-Orca.ps1 -Them ten url   them mot repo de theo doi, vd: -Them abc https://github.com/abc/orca.git
param([string[]]$Them)
$ErrorActionPreference = 'Stop'
# Commit da xem va da co ban tuong duong trong binhminh; them ma vao day de khong bao lai.
$daXem = @(
    'f91a89b0d' # lamng/deck-ui: ban nhap cu cua 4a7813f3d
)
Set-Location 'D:\Brainstorm_Idea\orca_bminh\orca'
if ($Them) { git remote add $Them[0] $Them[1] }

git fetch --all --prune --quiet
Write-Host "`n== Ban stable moi nhat cua Orca goc (ban dang dung dua tren v1.4.220):"
git ls-remote --tags --refs origin 'v1.*' | ForEach-Object { ($_ -split 'refs/tags/')[1] } |
    Where-Object { $_ -match '^v\d+\.\d+\.\d+$' } | Sort-Object { [version]$_.Substring(1) } -Descending |
    Select-Object -First 3

foreach ($remote in git remote) {
    if ($remote -eq 'origin') { continue }
    foreach ($ref in git for-each-ref --format='%(refname:short)' "refs/remotes/$remote") {
        if ($ref -match '/HEAD$' -or $ref -like '*/upstream-main') { continue }
        $commits = @(git log --oneline --no-merges --cherry-pick --right-only "binhminh...$ref" --not lamng/upstream-main |
            Where-Object { $daXem -notcontains $_.Split(' ')[0] })
        if ($commits.Count -eq 0) { continue }
        Write-Host "`n== $ref : $($commits.Count) commit rieng chua co trong ban cua ban"
        $commits | Select-Object -First 15
    }
}
Write-Host "`nXem chi tiet: git show <ma-commit>   Lay ve: git cherry-pick <ma-commit>"
