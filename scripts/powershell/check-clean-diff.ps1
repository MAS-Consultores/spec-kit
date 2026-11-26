# Clean code on the diff. Windows PowerShell 5.1.
param(
    [string]$Config = '',
    [string]$Findings = '',
    [string]$Baseline = '',
    [string]$Mode = ''
)
$ErrorActionPreference = 'Stop'
if (-not $Mode -and $Config) {
    foreach ($line in Get-Content -LiteralPath $Config) {
        if ($line -match '^clean_code_mode:\s*(.+)$') { $Mode = $Matches[1].Trim() }
    }
}
if (-not $Mode) { $Mode = 'info' }
if (-not $Findings) {
    [Console]::Error.WriteLine('INFORMA: sin hallazgos de clean code')
    exit 0
}
$known = @()
if ($Baseline -and (Test-Path -LiteralPath $Baseline)) {
    $known = @(Get-Content -LiteralPath $Baseline)
}
$new = 0
foreach ($line in Get-Content -LiteralPath $Findings) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($known -contains $line) { continue }
    [Console]::Error.WriteLine("clean-code: $line")
    $new++
}
if ($new -eq 0) { exit 0 }
if ($Mode -eq 'block') {
    [Console]::Error.WriteLine("$new hallazgos nuevos de clean code")
    exit 1
}
[Console]::Error.WriteLine("INFORMA: $new hallazgos de clean code (modo info)")
exit 0
