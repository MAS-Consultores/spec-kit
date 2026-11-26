# Evidence for validation and rollback. Windows PowerShell 5.1.
param(
    [string]$Names = '',
    [string]$Diff = '',
    [string]$Title = ''
)
$ErrorActionPreference = 'Stop'
$hit = $false
if ($Names) {
    foreach ($path in Get-Content -LiteralPath $Names) {
        if ($path -match '(^|/)auth/|(^|/)login/|password') { $hit = $true }
        if ($path -match '(^|/)(composer\.(json|lock)|package\.json|pnpm-lock\.yaml|package-lock\.json)$') { $hit = $true }
    }
}
if ($Diff) {
    foreach ($line in Get-Content -LiteralPath $Diff) {
        if ($line.StartsWith('+') -and -not $line.StartsWith('+++')) {
            if ($line -match '(^|[^A-Za-z0-9_])(password|credential|token|secret|revert)([^A-Za-z0-9_]|$)') { $hit = $true }
        }
    }
}
if ($Title -match '(?i)revert|upgrade|bump') { $hit = $true }
if ($hit) { Write-Output 'evidence' }
exit 0
