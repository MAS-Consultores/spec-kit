# H3. Windows PowerShell 5.1.
param(
    [Parameter(Mandatory = $true)][string]$Config,
    [Parameter(Mandatory = $true)][string]$Numstat
)
$ErrorActionPreference = 'Stop'
function Read-List([string]$Key, [string[]]$Lines) {
    $on = $false
    $items = @()
    foreach ($line in $Lines) {
        if ($line -match "^${Key}:\s*$") { $on = $true; continue }
        if ($on -and $line -match '^[^ \t-]') { $on = $false }
        if ($on -and $line -match '^\s*-\s*(.+)$') { $items += $Matches[1].Trim().Trim('"') }
    }
    return $items
}
$lines = @(Get-Content -LiteralPath $Config)
$harness = $false
$threshold = 300
foreach ($line in $lines) {
    if ($line -match '^harness:\s*true\s*$') { $harness = $true }
    if ($line -match '^test_line_threshold:\s*(\d+)$') { $threshold = [int]$Matches[1] }
}
$globs = @(Read-List 'test_globs' $lines)
$excludes = @(Read-List 'size_excludes' $lines)
$prod = 0
$tests = 0
foreach ($row in Get-Content -LiteralPath $Numstat) {
    $parts = $row -split "`t"
    if ($parts.Count -lt 3) { continue }
    $path = $parts[2]
    $skip = $false
    foreach ($rule in $excludes) {
        $base = Split-Path -Leaf $path
        if ($rule.EndsWith('/') -and ($path.StartsWith($rule) -or $path.Contains('/' + $rule))) { $skip = $true }
        elseif ($base -eq $rule) { $skip = $true }
    }
    if ($skip) { continue }
    $isTest = $false
    foreach ($glob in $globs) {
        $regex = '^' + [regex]::Escape($glob).Replace('\*', '.*') + '$'
        if ($path -match $regex) { $isTest = $true }
    }
    if ($isTest) { $tests++ } else { $prod += [int]$parts[0] }
}
if ($prod -gt $threshold -and $tests -eq 0) {
    if ($harness) {
        [Console]::Error.WriteLine("mas de $threshold lineas de produccion sin tests")
        exit 1
    }
    [Console]::Error.WriteLine("INFORMA: mas de $threshold lineas sin tests; hace falta Validacion manual")
}
exit 0
