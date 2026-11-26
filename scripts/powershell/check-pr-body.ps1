# H1. Recommended PR body. Windows PowerShell 5.1. Informs and does not fail.
param(
    [switch]$Promotion,
    [switch]$Evidence,
    [string]$Title = '',
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Path
)
$ErrorActionPreference = 'Stop'
if ($Title.StartsWith('chore(release): promover')) { $Promotion = $true }
$raw = Get-Content -LiteralPath $Path -Raw
if ($null -eq $raw) { $raw = '' }
$raw = [regex]::Replace($raw, '(?s)<!--\s*coderabbit\s*-->.*?<!--\s*/coderabbit\s*-->', '')
$raw = [regex]::Replace($raw, '(?s)<!--.*?-->', '')
function Join-Codes([int[]]$Codes) { -join ($Codes | ForEach-Object { [char]$_ }) }
$headingQue = Join-Codes 0x51,0x75,0xE9,0x20,0x79,0x20,0x70,0x6F,0x72,0x20,0x71,0x75,0xE9
$headingComo = Join-Codes 0x43,0xF3,0x6D,0x6F,0x20,0x73,0x65,0x20,0x76,0x61,0x6C,0x69,0x64,0xF3
$headingRiesgos = 'Riesgos/rollback'
$required = @($headingQue, 'Spec/tarea', $headingComo, $headingRiesgos, 'Fuera de alcance')
$missing = $false
$block = $false
foreach ($heading in $required) {
    $pattern = "(?s)^##\s+$([regex]::Escape($heading))\s*$\r?\n(.*?)(?=^##\s|\z)"
    $match = [regex]::Match($raw, $pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if (-not $match.Success -or [string]::IsNullOrWhiteSpace($match.Groups[1].Value)) {
        if ($Evidence -and ($heading -eq $headingComo -or $heading -eq $headingRiesgos)) {
            [Console]::Error.WriteLine("falta ${heading}: el PR trae otro hallazgo (tests, auth, upgrade o revert)")
            $block = $true
        } else {
            [Console]::Error.WriteLine("INFORMA: falta contenido en: $heading")
            $missing = $true
        }
    }
}
if ($Promotion) {
    if ($raw -notmatch '#[0-9]+') {
        [Console]::Error.WriteLine('INFORMA: la promocion no lista los PRs incluidos')
        $missing = $true
    }
    if ($raw -notmatch 'hallazgos de seguridad resueltos') {
        [Console]::Error.WriteLine('INFORMA: la promocion no trae el checklist de seguridad')
        $missing = $true
    }
}
if ($Title -and -not $Title.StartsWith('chore(release): promover')) {
    $desc = ''
    $colon = $Title.IndexOf(':')
    if ($colon -ge 0) { $desc = $Title.Substring($colon + 1).Trim() } else { $desc = $Title }
    $low = $desc.ToLowerInvariant()
    $tokens = [regex]::Matches($low, '[a-z0-9]{3,}')
    if ($low -match '^(testing|update|cambios( sp)?|fix[0-9]*|pruebas|modificaciones|pedidas|qa moni|fixs qas)$' -or $tokens.Count -lt 3) {
        [Console]::Error.WriteLine("INFORMA: titulo generico, recomendado ampliarlo: $Title")
    }
}
if ($missing) {
    [Console]::Error.WriteLine('INFORMA: el cuerpo del PR es recomendado; aplica criterio')
}
if ($block) { exit 1 }
exit 0
