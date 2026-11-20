#!/usr/bin/env pwsh
# Point main at the feature root when that branch does not exist yet, then
# merge the feature with --no-ff. Exit 1 when the work tree is dirty or the
# merge does not create a merge commit.
# Windows PowerShell 5.1 compatible.

$ErrorActionPreference = 'Stop'
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Fail([string]$Message) {
    [Console]::Error.WriteLine("ERROR: $Message")
    exit 1
}

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
    Fail 'not inside a git work tree'
}

$porcelain = @(git status --porcelain)
if ($LASTEXITCODE -ne 0) {
    Fail 'git status failed'
}
if ($porcelain.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace([string]$porcelain[0])) {
    Fail 'working tree is dirty'
}

$feature = git symbolic-ref --short HEAD 2> $null
if (-not $feature) {
    Fail 'detached HEAD'
}
if ($feature -eq 'main' -or $feature -eq 'master') {
    Fail "refusing to finish from '$feature'"
}
if ($feature -notmatch '^[0-9]+-[A-Za-z0-9]') {
    Fail "'$feature' is not a feature branch"
}

$featureSha = git rev-parse HEAD 2> $null
if ($LASTEXITCODE -ne 0 -or -not $featureSha) {
    Fail 'feature branch has no commits'
}
$featureSha = "$featureSha".Trim()

git show-ref --verify --quiet refs/heads/main
if ($LASTEXITCODE -ne 0) {
    $roots = @(git rev-list --max-parents=0 HEAD)
    if ($LASTEXITCODE -ne 0 -or $roots.Count -eq 0) {
        Fail 'cannot find the root commit'
    }
    $root = "$($roots[0])".Trim()
    if (-not $root) {
        Fail 'cannot find the root commit'
    }
    git branch main $root
    if ($LASTEXITCODE -ne 0) {
        Fail 'git branch main failed'
    }
}

git checkout main
if ($LASTEXITCODE -ne 0) {
    Fail 'git checkout main failed'
}

git merge --no-ff $feature -m "Merge $feature"
if ($LASTEXITCODE -ne 0) {
    Fail 'git merge failed'
}

$line = "$(git rev-list --parents -n 1 HEAD)".Trim()
if ($LASTEXITCODE -ne 0) {
    Fail 'cannot read merge parents'
}
$parts = @($line -split '\s+' | Where-Object { $_ })
if ($parts.Count -ne 3) {
    Fail 'merge did not produce a merge commit'
}

$second = "$(git rev-parse 'HEAD^2')".Trim()
if ($LASTEXITCODE -ne 0 -or $second -ne $featureSha) {
    Fail 'feature tip is not the second parent'
}

$after = @(git status --porcelain)
if ($LASTEXITCODE -ne 0) {
    Fail 'git status failed'
}
if ($after.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace([string]$after[0])) {
    Fail 'working tree is dirty after merge'
}

exit 0
