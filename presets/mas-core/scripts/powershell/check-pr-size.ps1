# H4. Windows PowerShell 5.1. Blocks only when h4_mode is block.
param(
    [Parameter(Mandatory = $true)][string]$Config,
    [Parameter(Mandatory = $true)][string]$Numstat,
    [string]$Labels = '',
    [string]$Body = ''
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
function Test-Excluded([string]$Path, [string[]]$Rules) {
    $base = Split-Path -Leaf $Path
    foreach ($rule in $Rules) {
        if ($rule.EndsWith('/')) {
            if ($Path.StartsWith($rule) -or $Path.Contains('/' + $rule)) { return $true }
        } elseif ($base -eq $rule -or $Path -eq $rule -or $Path.StartsWith($rule + '/')) {
            return $true
        }
    }
    return $false
}
$lines = @(Get-Content -LiteralPath $Config)
$mode = 'warn'
$warnAt = 800
$blockAt = 1500
foreach ($line in $lines) {
    if ($line -match '^h4_mode:\s*(.+)$') { $mode = $Matches[1].Trim() }
    if ($line -match '^own_code_warn:\s*(\d+)$') { $warnAt = [int]$Matches[1] }
    if ($line -match '^own_code_block:\s*(\d+)$') { $blockAt = [int]$Matches[1] }
}
$excludes = @(Read-List 'size_excludes' $lines)
$own = 0
$specs = @{}
$sawKit = $false
$sawVendor = $false
$sawProd = $false
$sawAny = $false
foreach ($row in Get-Content -LiteralPath $Numstat) {
    if ([string]::IsNullOrWhiteSpace($row)) { continue }
    $parts = $row -split "`t"
    if ($parts.Count -lt 3) { continue }
    $added = [int]$parts[0]
    $path = $parts[2]
    $sawAny = $true
    if ($path.StartsWith('.specify/') -or $path.StartsWith('.agents/') -or $path.StartsWith('.cursor/')) { $sawKit = $true }
    if ($path -match '(^|/)vendor/') { $sawVendor = $true }
    if (Test-Excluded $path $excludes) { continue }
    if (-not ($path.StartsWith('.specify/') -or $path.StartsWith('.agents/') -or $path.StartsWith('.cursor/'))) {
        $sawProd = $true
        $own += $added
    }
    if ($path -match '^specs/(\d{3}-[^/]+)') { $specs[$Matches[1]] = $true }
}
if (-not $sawAny) { [Console]::Error.WriteLine('INFORMA: el diff no tiene cambios'); exit 0 }
$fail = $false
if ($own -gt $warnAt) { [Console]::Error.WriteLine("AVISO: $own lineas propias (umbral $warnAt)") }
if ($own -gt $blockAt -or $specs.Count -gt 1) {
    $justified = $Labels.Split(',') -contains 'pr-grande-justificado'
    $reason = $false
    if ($Body -and (Test-Path -LiteralPath $Body)) {
        $reason = (Get-Content -LiteralPath $Body -Raw) -match 'pr-grande'
    }
    if ($justified -and $reason) {
        [Console]::Error.WriteLine('AVISO: presupuesto superado con pr-grande-justificado')
    } elseif ($mode -eq 'block') {
        [Console]::Error.WriteLine('presupuesto de codigo propio o mas de un spec')
        $fail = $true
    } else {
        [Console]::Error.WriteLine('INFORMA: presupuesto de codigo propio o mas de un spec (h4_mode=warn)')
    }
}
if ($sawKit -and $sawProd) { [Console]::Error.WriteLine('INFORMA: el diff mezcla Spec Kit o agentes con codigo de produccion') }
if ($sawVendor -and $sawProd) { [Console]::Error.WriteLine('INFORMA: el diff mezcla vendor con codigo de produccion') }
if ($fail) { exit 1 }
exit 0
