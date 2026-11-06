; Instalador do Dashboard de Membros
; Compatível com Inno Setup 6+

[Setup]
AppName=Dashboard de Membros
AppVersion=1.1.0
DefaultDirName={commonpf}\DashboardMembros
DefaultGroupName=Dashboard de Membros
AppId={{D5A47936-4D5A-4E59-BD3E-06E7AC3FBBE4}
OutputDir=.
OutputBaseFilename=DashboardMembrosSetup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\start.bat
CreateAppDir=yes

[Files]
Source: "..\*.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\*.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\*.hta"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\*.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\*.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\public\*"; DestDir: "{app}\public"; Flags: recursesubdirs; Excludes: "avatars\*,logos\*,*.log"
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: recursesubdirs
Source: "..\backend\*"; DestDir: "{app}\backend"; Flags: recursesubdirs; Excludes: "node_modules\*,log\*,uploads\*,database\Backup_banco\*,database\Build-Backup\*,*.env,*.env.*,*.log,*.lock,*.tmp"
Source: "..\installer\*"; DestDir: "{app}\installer"; Flags: recursesubdirs; Excludes: "DashboardMembrosSetup.exe,.env,.env.*,releases\*\temp_backup.7z,releases\*\dist*.7z,releases\*\temp_backup\*,releases\*\tmp-update-target\*,releases\*\bkp-*\*"

[Dirs]
Name: "{app}\backend\database\Build-Backup"; Permissions: users-modify

[Icons]
Name: "{group}\Dashboard de Membros"; Filename: "{app}\IniciarTudo.bat"
Name: "{group}\Atualizar Dashboard"; Filename: "{app}\AtualizarDashboard.bat"
Name: "{userdesktop}\Dashboard de Membros"; Filename: "{app}\IniciarTudo.bat"; Tasks: desktopicon
Name: "{userdesktop}\Atualizar Dashboard"; Filename: "{app}\AtualizarDashboard.bat"; Tasks: desktopicon

[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\installer\configure-firewall.ps1"""; StatusMsg: "Configurando acesso de rede local..."; Flags: runhidden waituntilterminated
Filename: "{app}\IniciarTudo.bat"; Description: "Iniciar o Dashboard de Membros"; Flags: postinstall nowait

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na área de trabalho"; GroupDescription: "Opções adicionais:"
