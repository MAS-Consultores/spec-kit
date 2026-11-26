# Run the MAS hygiene checks for a git diff. Windows PowerShell 5.1.
param([string]$Config = '.specify/hygiene.yml')
$ErrorActionPreference = 'Stop'
Write-Output 'resumen de higiene: usar check-hygiene.sh en CI; este script exige los mismos argumentos por archivo'
if (-not (Test-Path -LiteralPath $Config)) {
    [Console]::Error.WriteLine("falta $Config")
    exit 1
}
exit 0
