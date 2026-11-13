#!/usr/bin/env pwsh
# Exit 1 when HEAD is main, master, detached, or not a feature branch.
# Windows PowerShell 5.1 compatible.

$ErrorActionPreference = 'Stop'

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
    [Console]::Error.WriteLine('ERROR: not inside a git work tree')
    exit 1
}

$head = git symbolic-ref --short HEAD 2> $null
if (-not $head) {
    [Console]::Error.WriteLine('ERROR: detached HEAD is not a feature branch')
    exit 1
}

if ($head -eq 'main' -or $head -eq 'master') {
    [Console]::Error.WriteLine("ERROR: refusing to continue on '$head'")
    exit 1
}

if ($head -notmatch '^[0-9]+-[A-Za-z0-9]') {
    [Console]::Error.WriteLine("ERROR: '$head' is not a feature branch")
    exit 1
}

$repo = git rev-parse --show-toplevel
$featureJson = Join-Path $repo '.specify/feature.json'
if (Test-Path -LiteralPath $featureJson -PathType Leaf) {
    $raw = Get-Content -LiteralPath $featureJson -Raw
    $featureDir = $null
    if ($raw -match '"feature_directory"\s*:\s*"([^"]+)"') {
        $featureDir = $Matches[1]
    }
    if ($featureDir) {
        $base = ($featureDir -replace '[\\/]+$', '')
        $base = Split-Path -Path $base -Leaf
        if ($head -ne $base) {
            [Console]::Error.WriteLine("ERROR: HEAD '$head' does not match feature directory '$base'")
            exit 1
        }
    }
}

exit 0
