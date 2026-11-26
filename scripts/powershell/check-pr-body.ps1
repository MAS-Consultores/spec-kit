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
$required = @('Qué y por qué', 'Spec/tarea', 'Cómo se validó', 'Riesgos/rollback', 'Fuera de alcance')
$missing = $false
$block = $false
foreach ($heading in $required) {
    $pattern = "(?s)^##\s+$([regex]::Escape($heading))\s*$\r?\n(.*?)(?=^##\s|\z)"
    $match = [regex]::Match($raw, $pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if (-not $match.Success -or [string]::IsNullOrWhiteSpace($match.Groups[1].Value)) {
        if ($Evidence -and ($heading -eq 'Cómo se validó' -or $heading -eq 'Riesgos/rollback')) {
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
