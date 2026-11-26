# H9. Windows PowerShell 5.1.
param(
    [Parameter(Mandatory = $true)][string]$Names,
    [string]$Root = ''
)
$ErrorActionPreference = 'Stop'
$fail = $false
foreach ($path in Get-Content -LiteralPath $Names) {
    if ($path -notmatch '\.php$') { continue }
    if ($path -match '/(classes|db|lang|tests|amd)/') { continue }
    $file = $path
    if ($Root) { $file = Join-Path $Root $path }
    if (-not (Test-Path -LiteralPath $file)) {
        [Console]::Error.WriteLine("no se puede leer $path")
        $fail = $true
        continue
    }
    $text = Get-Content -LiteralPath $file -Raw
    if ($text -match 'require_login\s*\(|require_capability\s*\(|mas-hygiene: public') { continue }
    [Console]::Error.WriteLine("entrypoint sin require_login ni declaracion publica: $path")
    $fail = $true
}
if ($fail) { exit 1 }
exit 0
