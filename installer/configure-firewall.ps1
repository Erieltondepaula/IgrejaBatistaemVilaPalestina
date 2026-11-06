$ErrorActionPreference = 'Stop'

$ruleName = 'Dashboard de Membros - Atualizações LAN (TCP 8081)'

try {
    Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue |
        Remove-NetFirewallRule

    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort 8081 `
        -RemoteAddress LocalSubnet `
        -Profile Any | Out-Null
}
catch {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
        "Não foi possível liberar a porta TCP 8081 para a rede local. Execute o instalador como administrador e tente novamente.`n`n$($_.Exception.Message)",
        'Dashboard de Membros - Firewall',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning
    ) | Out-Null
    exit 1
}
