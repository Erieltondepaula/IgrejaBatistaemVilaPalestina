# Backups da build

Depois de executar `npm run build`, a pasta `dist` recebe uma identificação exclusiva. Na próxima inicialização, o sistema arquiva essa build neste diretório.

- Formato: `build-AAAA-MM-DD_HH-mm-ss-mmm`, usando a data e hora em que a build foi gerada.
- Cada pasta contém uma cópia independente dos arquivos servidos pelo painel.
- A mesma build é arquivada uma única vez; iniciar o sistema novamente sem gerar outra build não cria cópias repetidas.
- Os backups não são removidos automaticamente.
- Se não houver uma build nova, o inicializador informa que nenhuma cópia foi criada. Se o arquivamento falhar, avisa e continua iniciando o sistema.

Em instalações no Windows, o instalador concede permissão de gravação para este diretório. A pasta de backups não é incluída em instaladores, manifestos nem atualizações.
