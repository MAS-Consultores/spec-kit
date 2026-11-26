# H5 and H8. Windows PowerShell 5.1.
param(
    [string]$Config = '',
    [Parameter(Mandatory = $true)]
    [string]$Names
)
$ErrorActionPreference = 'Stop'
$data = @()
if ($Config -and (Test-Path -LiteralPath $Config)) {
    $on = $false
    foreach ($line in Get-Content -LiteralPath $Config) {
        if ($line -match '^data_paths:\s*$') { $on = $true; continue }
        if ($on -and $line -match '^[^ \t-]') { $on = $false }
        if ($on -and $line -match '^\s*-\s*(.+)$') { $data += $Matches[1].Trim().Trim('"') }
    }
}
$fail = $false
foreach ($path in Get-Content -LiteralPath $Names) {
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    $base = Split-Path -Leaf $path
    $blocked = $false
    if ($base -match '(^\.DS_Store$|^Thumbs\.db$|\.log$|^tmp-|_tmp\.|\.code-workspace$|\.orig$|\.swp$|^prueba.*\.txt$|^gemini-code-.*\.md$)') {
        $blocked = $true
    }
    if ($path -match 'Zone\.Identifier|(^|/)\.idea/') { $blocked = $true }
    if ($base -match '\.(pfx|p12|pem|key|xlsx|xls|csv|mbz)$' -or $base -match '\.sql\.gz$') {
        if ($path -notmatch 'Fixture|fixtures') { $blocked = $true }
    }
    foreach ($prefix in $data) {
        if ($path.StartsWith($prefix) -or $path.Contains('/' + $prefix)) { $blocked = $true }
    }
    if ($blocked) {
        [Console]::Error.WriteLine("archivo prohibido: $path")
        $fail = $true
    }
}
if ($fail) { exit 1 }
exit 0
