param(
    [Parameter(Mandatory = $true)][string]$RootDir,
    [Parameter(Mandatory = $true)][string]$NodePath,
    [Parameter(Mandatory = $true)][string]$SourceUrl,
    [Parameter(Mandatory = $true)][string]$StatusPath
)

$ErrorActionPreference = 'Stop'

function Write-UpdateStatus([string]$Status, [string]$Message) {
    $payload = @{ status = $Status; message = $Message } | ConvertTo-Json -Compress
    Set-Content -LiteralPath $StatusPath -Value $payload -Encoding UTF8
}

try {
    $resolvedRoot = (Resolve-Path -LiteralPath $RootDir).Path
    $updaterPath = Join-Path $resolvedRoot 'installer\updater.js'
    if (-not (Test-Path -LiteralPath $NodePath -PathType Leaf)) {
        throw 'O executável do Node.js não foi encontrado.'
    }
    if (-not (Test-Path -LiteralPath $updaterPath -PathType Leaf)) {
        throw 'O script de atualização não foi encontrado.'
    }

    Write-UpdateStatus 'awaiting-approval' 'Aguardando autorização do Windows.'
    $arguments = '"{0}" --target "{1}" --source-url "{2}"' -f $updaterPath, $resolvedRoot, $SourceUrl
    $process = Start-Process -FilePath $NodePath -ArgumentList $arguments -WorkingDirectory $resolvedRoot -Verb RunAs -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "O atualizador encerrou com código $($process.ExitCode)."
    }

    Write-UpdateStatus 'completed' 'Atualização concluída.'
}
catch {
    Write-UpdateStatus 'failed' $_.Exception.Message
    exit 1
}
