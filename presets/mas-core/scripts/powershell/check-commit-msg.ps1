# Validate one Conventional Commits 1.0.0 message (file path or literal).
# Windows PowerShell 5.1.
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Message
)

$ErrorActionPreference = 'Stop'

if (Test-Path -LiteralPath $Message -PathType Leaf) {
    $raw = Get-Content -LiteralPath $Message -Raw
    if ($null -eq $raw) {
        $raw = ''
    }
} else {
    $raw = $Message
}

$raw = $raw -replace "`r", ''
$first = ($raw -split "`n", 2)[0]

if ([string]::IsNullOrWhiteSpace($first)) {
    [Console]::Error.WriteLine('mensaje de commit vacío')
    exit 1
}

if ($first.StartsWith('Merge ') -or $first.StartsWith('Revert "') -or $first.StartsWith('fixup!') -or $first.StartsWith('squash!')) {
    exit 0
}

if ($first.Length -gt 100) {
    [Console]::Error.WriteLine("el encabezado supera 100 caracteres ($($first.Length))")
    exit 1
}

$types = 'feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
$pattern = "^(${types})(\([A-Za-z0-9][A-Za-z0-9._/-]*\))?(!)?: [^ \t].*[^.]$|^(${types})(\([A-Za-z0-9][A-Za-z0-9._/-]*\))?(!)?: [^ \t.]$"

if (-not [regex]::IsMatch($first, $pattern)) {
    [Console]::Error.WriteLine("el mensaje no cumple Conventional Commits 1.0.0: $first")
    exit 1
}

exit 0
