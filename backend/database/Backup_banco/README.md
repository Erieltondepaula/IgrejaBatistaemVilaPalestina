# Pasta de Backups Automáticos

Esta pasta armazena os backups automáticos dos membros quando o diretório da aplicação permite gravação.

- Um backup é criado ao iniciar o backend e outro a cada 24 horas.
- Formato: `backup-YYYY-MM-DD-HH-mm-ss-mmm.json`
- Mantém os 10 backups mais recentes
- Backups mais antigos são removidos automaticamente

Se o sistema estiver instalado em uma pasta protegida, como `C:\Program Files`, os backups serão gravados em `%LOCALAPPDATA%\DashboardMembros\backups`. Também é possível definir um caminho absoluto usando `DASHBOARD_BACKUP_DIR`.

O inicializador mostra o resultado e o horário da última cópia; em caso de falha, mostra o erro sem impedir a abertura do sistema. Os arquivos contêm dados pessoais e não devem ser compartilhados. Eles não são versionados no Git.
