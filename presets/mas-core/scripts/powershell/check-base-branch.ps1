# H7. Windows PowerShell 5.1.
param(
    [Parameter(Mandatory = $true)]
    [string]$Config,
    [string]$Base = $env:GITHUB_BASE_REF,
    [string]$Head = $env:GITHUB_HEAD_REF
)
$ErrorActionPreference = 'Stop'
$prod = ''
$refs = @()
$on = $false
foreach ($line in Get-Content -LiteralPath $Config) {
    if ($line -match '^production_branch:\s*(.+)$') { $prod = $Matches[1].Trim().Trim('"') }
    if ($line -match '^integration_refs:\s*$') { $on = $true; continue }
    if ($on -and $line -match '^[^ \t-]') { $on = $false }
    if ($on -and $line -match '^\s*-\s*(.+)$') { $refs += $Matches[1].Trim().Trim('"') }
}
if ([string]::IsNullOrWhiteSpace($prod) -or $Base -ne $prod) { exit 0 }
foreach ($ref in $refs) {
    if ($ref -eq '*') { exit 0 }
    if ($ref.EndsWith('*')) {
        $prefix = $ref.Substring(0, $ref.Length - 1)
        if ($Head.StartsWith($prefix)) { exit 0 }
    } elseif ($Head -eq $ref) {
        exit 0
    }
}
[Console]::Error.WriteLine("a $prod solo se llega desde: $($refs -join ' ')")
exit 1
