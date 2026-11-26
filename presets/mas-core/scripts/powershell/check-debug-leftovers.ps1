# H13. Windows PowerShell 5.1.
param(
    [string]$Diff = '',
    [string]$Deleted = ''
)
$ErrorActionPreference = 'Stop'
$fail = $false
if ($Diff) {
    foreach ($line in Get-Content -LiteralPath $Diff) {
        if ($line.StartsWith('+++')) { continue }
        if ($line.StartsWith('+') -and $line -match 'var_dump|print_r|error_log\(|dd\(|dump\(|console\.log|debugger|ray\(') {
            [Console]::Error.WriteLine("debug en linea agregada: $line")
            $fail = $true
        }
    }
}
if ($Deleted) {
    foreach ($path in Get-Content -LiteralPath $Deleted) {
        if ($path -match '(^\.env\.example$|^\.dockerignore$|^\.gitignore$|(^|/)\.github(/|$))') {
            [Console]::Error.WriteLine("INFORMA: se borro un archivo protegido: $path")
        }
    }
}
if ($fail) { exit 1 }
exit 0
