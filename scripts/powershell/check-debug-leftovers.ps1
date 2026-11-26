# H13. Windows PowerShell 5.1.
# Skips the hygiene scripts, Markdown, the .specify/ tree, and
# debug_leftovers_exclude from hygiene.yml.
param(
    [string]$Diff = '',
    [string]$Deleted = '',
    [string]$Config = ''
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
        if ([string]::IsNullOrEmpty($rule)) { continue }
        if ($rule.EndsWith('/')) {
            if ($Path.StartsWith($rule) -or $Path.Contains('/' + $rule)) { return $true }
        } elseif ($base -eq $rule -or $Path -eq $rule -or $Path.StartsWith($rule + '/') -or $Path.Contains('/' + $rule + '/')) {
            return $true
        }
    }
    return $false
}
function Test-DebugSkip([string]$Path, [string[]]$Extra) {
    if ([string]::IsNullOrEmpty($Path)) { return $false }
    $name = Split-Path -Leaf $Path
    if ($name -like '*.md') { return $true }
    if ($Path -eq '.specify' -or $Path.StartsWith('.specify/') -or $Path.Contains('/.specify/')) { return $true }
    if ($name -eq 'check-debug-leftovers.sh' -or $name -eq 'check-debug-leftovers.ps1') { return $true }
    if ($Path -match '(^|/)scripts/bash/check-[^/]+\.sh$' -or $Path -match '(^|/)scripts/powershell/check-[^/]+\.ps1$') { return $true }
    if ($Extra.Count -gt 0 -and (Test-Excluded $Path $Extra)) { return $true }
    return $false
}
$extra = @()
if ($Config -and (Test-Path -LiteralPath $Config)) {
    $extra = @(Read-List 'debug_leftovers_exclude' @(Get-Content -LiteralPath $Config))
}
$fail = $false
if ($Diff) {
    $file = ''
    foreach ($line in Get-Content -LiteralPath $Diff) {
        if ($line.StartsWith('+++ ')) {
            $file = $line.Substring(4)
            $tab = $file.IndexOf("`t")
            if ($tab -ge 0) { $file = $file.Substring(0, $tab) }
            if ($file.StartsWith('b/')) { $file = $file.Substring(2) }
            if ($file -eq '/dev/null') { $file = '' }
            continue
        }
        if ($line.StartsWith('+++')) { continue }
        if ($line.StartsWith('+') -and -not (Test-DebugSkip $file $extra) -and $line -match 'var_dump|print_r|error_log\(|dd\(|dump\(|console\.log|debugger|ray\(') {
            [Console]::Error.WriteLine("MAS-DEBUG dd( $line")
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
