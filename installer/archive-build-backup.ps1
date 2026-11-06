param(
    [Parameter(Mandatory = $true)]
    [string]$BuildDirectory,
    [Parameter(Mandatory = $true)]
    [string]$BackupDirectory
)

$ErrorActionPreference = 'Stop'

$buildInfoPath = Join-Path $BuildDirectory 'build-info.json'
if (-not (Test-Path -LiteralPath $buildInfoPath -PathType Leaf)) {
    Write-Host 'No new build was identified. Run npm run build before startup to generate one.'
    return
}

$buildInfo = Get-Content -LiteralPath $buildInfoPath -Raw | ConvertFrom-Json
$buildId = [string]$buildInfo.buildId
if ([string]::IsNullOrWhiteSpace($buildId) -or [string]::IsNullOrWhiteSpace([string]$buildInfo.generatedAt)) {
    throw "Identificação inválida em $buildInfoPath."
}
$generatedAt = [DateTimeOffset]::Parse([string]$buildInfo.generatedAt).ToLocalTime()

New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$lastBuildIdPath = Join-Path $BackupDirectory '.last-archived-build-id'
$lastBuildId = if (Test-Path -LiteralPath $lastBuildIdPath -PathType Leaf) {
    (Get-Content -LiteralPath $lastBuildIdPath -Raw).Trim()
} else {
    ''
}

if ($lastBuildId -eq $buildId) {
    Write-Host "Build $buildId was already archived; no duplicate was created."
    return
}

$timestamp = $generatedAt.ToString('yyyy-MM-dd_HH-mm-ss-fff')
$backupName = "build-$timestamp"
$backupPath = Join-Path $BackupDirectory $backupName
if (Test-Path -LiteralPath $backupPath) {
    $safeBuildId = $buildId -replace '[^a-zA-Z0-9-]', '_'
    $backupPath = Join-Path $BackupDirectory "$backupName-$safeBuildId"
}
if (Test-Path -LiteralPath $backupPath) {
    throw "Um backup já existe para a build $buildId em $backupPath."
}
$stagingPath = "$backupPath.tmp"

try {
    New-Item -ItemType Directory -Path $stagingPath | Out-Null
    Get-ChildItem -LiteralPath $BuildDirectory -Force |
        Copy-Item -Destination $stagingPath -Recurse -Force -ErrorAction Stop

    $stagedBuildInfoPath = Join-Path $stagingPath 'build-info.json'
    if (-not (Test-Path -LiteralPath (Join-Path $stagingPath 'index.html') -PathType Leaf)) {
        throw 'A cópia da build não contém index.html.'
    }
    if (-not (Test-Path -LiteralPath $stagedBuildInfoPath -PathType Leaf)) {
        throw 'A cópia não contém build-info.json.'
    }

    $stagedBuildInfo = Get-Content -LiteralPath $stagedBuildInfoPath -Raw | ConvertFrom-Json
    if ([string]$stagedBuildInfo.buildId -ne $buildId) {
        throw 'The build changed during copying; it will be archived on the next startup.'
    }

    Move-Item -LiteralPath $stagingPath -Destination $backupPath
    $markerTempPath = "$lastBuildIdPath.$PID.tmp"
    Set-Content -LiteralPath $markerTempPath -Value $buildId -NoNewline -Encoding ASCII
    Move-Item -LiteralPath $markerTempPath -Destination $lastBuildIdPath -Force

    Write-Host "Build nova arquivada em $backupPath."
}
catch {
    if (Test-Path -LiteralPath $stagingPath) {
        try {
            Remove-Item -LiteralPath $stagingPath -Recurse -Force -ErrorAction Stop
        }
        catch {
            Write-Warning "Could not remove incomplete copy at $stagingPath`: $($_.Exception.Message)"
        }
    }
    throw
}
