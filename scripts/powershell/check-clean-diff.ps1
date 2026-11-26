# Clean code on the diff. Windows PowerShell 5.1.
param(
    [string]$Config = '',
    [string]$Findings = '',
    [string]$Baseline = '',
    [string]$Mode = '',
    [string]$Names = '',
    [string]$Diff = '',
    [string]$Root = '.'
)
$ErrorActionPreference = 'Stop'
if (-not $Mode -and $Config) {
    foreach ($line in Get-Content -LiteralPath $Config) {
        if ($line -match '^clean_code_mode:\s*(.+)$') { $Mode = $Matches[1].Trim() }
    }
}
if (-not $Mode) { $Mode = 'info' }
$extra = @()
function Test-AddedLine([string]$File, [int]$Number) {
    if (-not $Diff) { return $true }
    $current = ''
    $start = 0
    foreach ($row in Get-Content -LiteralPath $Diff) {
        if ($row.StartsWith('+++ ')) {
            $current = $row.Substring(4).Trim()
            if ($current.StartsWith('b/')) { $current = $current.Substring(2) }
        }
        if ($row.StartsWith('@@') -and $current -and ($current -eq $File -or $current.Contains($File))) {
            if ($row -match '\+(\d+)') { $start = [int]$Matches[1] }
        }
        if ($current -and ($current -eq $File -or $current.Contains($File)) -and $row.StartsWith('+') -and -not $row.StartsWith('+++')) {
            if ($start -eq $Number) { return $true }
            $start++
        }
    }
    return $false
}
if ($Names) {
    $langs = @()
    if ($Config) {
        $on = $false
        foreach ($row in Get-Content -LiteralPath $Config) {
            if ($row -match '^clean_langs:\s*$') { $on = $true; continue }
            if ($on -and $row -match '^[^ \t-]') { $on = $false }
            if ($on -and $row -match '^\s*-\s*(.+)$') { $langs += $Matches[1].Trim().Trim('"') }
        }
    }
    foreach ($path in Get-Content -LiteralPath $Names) {
        if (-not $path) { continue }
        if ($langs -contains 'php' -and $path.EndsWith('.php')) {
            if (-not (Get-Command phpmd -ErrorAction SilentlyContinue)) {
                if ($Mode -eq 'block') {
                    [Console]::Error.WriteLine('falta phpmd para medir el diff')
                    exit 1
                }
                [Console]::Error.WriteLine('INFORMA: falta phpmd; no se midio el diff')
            } else {
                $rules = Join-Path $Root '.specify/templates/phpmd.xml'
                $target = Join-Path $Root $path
                $out = & phpmd $target text $rules 2>&1 | Out-String
                foreach ($row in ($out -split "`n")) {
                    if ($row -match '^(.+):(\d+):') {
                        if (Test-AddedLine $Matches[1] ([int]$Matches[2])) { $extra += $row.Trim() }
                    }
                }
            }
        }
    }
}
if (-not $Findings -and -not $Names) {
    [Console]::Error.WriteLine('falta la lista de archivos del diff')
    exit 1
}
$known = @()
if ($Baseline -and (Test-Path -LiteralPath $Baseline)) {
    $known = @(Get-Content -LiteralPath $Baseline)
}
$lines = @()
if ($Findings) { $lines = @(Get-Content -LiteralPath $Findings) }
$lines += $extra
$new = 0
foreach ($line in $lines) {
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
