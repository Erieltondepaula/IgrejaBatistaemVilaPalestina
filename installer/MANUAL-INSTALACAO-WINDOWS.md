# Manual de instalação do Dashboard de Membros no Windows

## Leia antes de começar

O `DashboardMembrosSetup.exe` **não é um pacote autossuficiente**. O instalador copia os arquivos do Dashboard, configura a regra local do Firewall para a porta TCP 8081 e tenta iniciar o sistema. Ele **não instala** Node.js, PostgreSQL, dependências do backend nem configura/copia o banco de dados.

Para uma máquina nova, siga todos os passos deste manual antes de usar `IniciarTudo.bat`. A instalação e os serviços precisam ser preparados separadamente em cada computador.

### O que precisa estar instalado

- Windows 10/11 de 64 bits e uma conta com permissão de administrador para instalar programas.
- Node.js LTS (o instalador também instala o npm).
- PostgreSQL 17, com o serviço `postgresql-x64-17` e as ferramentas de linha de comando.
- Dependências do backend instaladas com `npm install`.
- Um backup válido do banco PostgreSQL da instalação atual (ou uma migração de esquema validada para a versão do backend) e um arquivo `backend\.env` com as credenciais corretas.
- Acesso à internet durante a instalação do Node.js/PostgreSQL e ao baixar as dependências npm.
- Para computadores secundários: acesso à rede local da máquina principal e uma cópia inicial do banco, se for necessário exibir os mesmos cadastros.

O pgAdmin é opcional; é apenas uma ferramenta gráfica para administrar o PostgreSQL.

## 1. Decida a função do computador

- **Máquina principal:** mantém a publicação das versões e serve as atualizações pela porta 8081.
- **Máquina secundária:** consulta a principal e baixa atualizações de programa.

O atualizador distribui arquivos de programa. Ele **não sincroniza o banco de dados**, `.env`, fotos, logos ou uploads. Cada computador tem sua própria API e seu próprio PostgreSQL local. Para compartilhar cadastros entre computadores, configure a integração com a mesma planilha Google conforme o [guia de sincronização](./GUIA-SINCRONIZACAO-GOOGLE-SHEETS.md). O formulário de novo membro grava na planilha quando a integração está configurada; alterações feitas nas telas de gestão não são enviadas à planilha e devem ser feitas nela para serem importadas nos computadores.

## 2. Instale o Node.js

1. Baixe a versão **LTS** do site oficial: <https://nodejs.org/>.
2. Execute o instalador e mantenha habilitadas as opções padrão, incluindo npm e inclusão no `PATH`.
3. Feche e reabra o PowerShell. Verifique:

   ```powershell
   node --version
   npm --version
   ```

   Os dois comandos precisam mostrar uma versão, sem erro de comando não encontrado.

## 3. Instale o PostgreSQL 17

1. Baixe o instalador do Windows pelo site oficial: <https://www.postgresql.org/download/windows/>.
2. Escolha PostgreSQL **17.x**. O atalho de inicialização atual procura o serviço `postgresql-x64-17`.
3. Mantenha instaladas as ferramentas de linha de comando. O pgAdmin pode ser instalado junto ou separado.
4. Durante a instalação, crie uma senha de administrador do PostgreSQL (`postgres`) e guarde-a em local seguro. Ela não é a mesma coisa que a senha do usuário da aplicação.
5. Deixe o serviço PostgreSQL configurado para iniciar automaticamente com o Windows.
6. Abra PowerShell e confirme:

   ```powershell
   Get-Service postgresql-x64-17
   Test-NetConnection localhost -Port 5432
   ```

   O serviço deve estar `Running` e o teste da porta 5432 deve retornar `TcpTestSucceeded: True`.

Não libere a porta 5432 para a rede. O banco deste procedimento é local ao computador; as atualizações de programa usam a porta 8081.

## 4. Execute o instalador do Dashboard

1. Copie o `DashboardMembrosSetup.exe` para o computador.
2. Clique com o botão direito e escolha **Executar como administrador**.
3. Use a pasta padrão `C:\Program Files\DashboardMembros`, se não houver uma orientação diferente.
4. O instalador cria uma regra de entrada TCP 8081 limitada à sub-rede local. Se o Windows perguntar sobre acesso à rede, permita em redes privadas.
5. Se o instalador tentar iniciar o Dashboard e falhar por falta de dependências ou configuração do banco, feche a mensagem. Continue com os passos seguintes; isso não significa que Node.js ou PostgreSQL tenham sido instalados.

## 5. Instale as dependências do backend

Abra **PowerShell como administrador** e execute (ajuste o caminho se instalou em outra pasta):

```powershell
Set-Location 'C:\Program Files\DashboardMembros\backend'
npm install --omit=dev
```

Espere a conclusão sem erros. A pasta `backend\node_modules` deve ser criada. Se o comando `npm` não for reconhecido, volte ao passo 2, instale o Node.js e abra uma nova janela do PowerShell.

## 6. Crie o usuário, o banco local e configure a conexão

Use pgAdmin ou `psql` para conectar ao servidor local como administrador PostgreSQL (`postgres`). Crie um usuário próprio da aplicação, usando uma senha forte escolhida por você:

```sql
CREATE ROLE dashboard_app WITH LOGIN PASSWORD 'SUBSTITUA_POR_UMA_SENHA_FORTE';
```

Depois, em uma execução separada no banco `postgres`, crie o banco da aplicação:

```sql
CREATE DATABASE dashboard_membros OWNER dashboard_app;
```

Se o banco já existir, **não o apague nem o recrie**. Primeiro confirme com o responsável pelo sistema se ele contém dados que precisam ser mantidos.

Crie o arquivo `C:\Program Files\DashboardMembros\backend\.env` (a pasta `backend`, não a raiz do projeto) e coloque:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dashboard_membros
DB_USER=dashboard_app
DB_PASSWORD=SUBSTITUA_PELA_MESMA_SENHA_DO_USUARIO
PORT=5001
NODE_ENV=production
```

Substitua o valor de `DB_PASSWORD` pela mesma senha usada no `CREATE ROLE`. Não compartilhe esse arquivo e não o envie junto com o instalador.

### Restaure o banco existente

Restaure um backup completo do PostgreSQL criado na máquina principal, seguindo o passo 7. A instalação precisa de um esquema compatível com o backend, não apenas de um banco vazio.

> **Não use `backend\database\init\01-create-schema.sql` para preparar uma instalação nova.** Esse arquivo não contém todas as colunas que o backend atual espera e ainda diverge da estrutura de membros. Ele não é uma migração validada para uma instalação limpa.

Se ainda não existe uma instalação/banco válido para fazer backup, pare neste ponto: é necessário que o responsável pelo sistema forneça uma migração de banco validada para o backend atual. O `.exe` e os scripts atuais não criam um banco novo compatível de ponta a ponta.

## 7. Faça backup e restaure os dados

Cada computador executa a própria API e precisa de uma base PostgreSQL local. Faça backup e restauração para inicializar o banco da máquina nova:

1. Na máquina que contém a base válida, abra pgAdmin e faça backup de `dashboard_membros` em formato **Custom** (`.backup`), incluindo esquema e dados.
2. Proteja o arquivo: ele contém dados pessoais de membros. Transfira-o por mídia/local seguro e não o publique nem o envie sem autorização.
3. Na máquina nova, crie o usuário e um banco `dashboard_membros` vazio pelos passos 3 e 6.
4. No pgAdmin, restaure o backup completo no banco vazio. Se a restauração indicar que o proprietário do backup não existe, crie o mesmo role no servidor novo ou use a opção **No owner/Não restaurar proprietário**, se disponível.
5. Se fotos, logos ou arquivos enviados também forem necessários, copie-os separadamente para as pastas correspondentes da instalação. Eles não fazem parte do pacote do instalador nem das atualizações de programa.
6. Apague as cópias temporárias do backup quando não forem mais necessárias, seguindo a política de segurança da igreja.

Na secundária, esse backup fornece uma cópia inicial dos cadastros e do esquema. Para receber novos registros e alterações feitas na planilha, configure também a integração descrita no [guia de sincronização Google Sheets](./GUIA-SINCRONIZACAO-GOOGLE-SHEETS.md). A importação periódica da planilha não substitui nem propaga automaticamente as alterações/exclusões feitas nas telas de gestão.

## 8. Inicie e valide o sistema

1. Na pasta de instalação, clique com o botão direito em `IniciarTudo.bat` e escolha **Executar como administrador** na primeira inicialização.
2. Aguarde a mensagem de servidor online. O inicializador verifica a conexão com PostgreSQL, a API na porta 5001 e o painel na porta 8081 antes de liberar a abertura.
3. No PowerShell, confirme os serviços locais:

   ```powershell
   Get-Service postgresql-x64-17
   Invoke-RestMethod http://127.0.0.1:5001/api/system/updates/ready
   (Invoke-RestMethod http://127.0.0.1:8081/latest.json).version
   ```

   A API deve responder `ready: True`; o último comando deve exibir a versão publicada.
4. Clique em **SIM** na janela do inicializador para abrir `http://127.0.0.1:8081`.

O backend cria um backup automático dos membros ao iniciar e a cada 24 horas. A janela informa o horário, o total de registros e uma falha, caso ocorra. Os arquivos ficam em `backend\database\Backup_banco`; se a instalação estiver em uma pasta protegida, são salvos em `%LOCALAPPDATA%\DashboardMembros\backups`. A retenção é limitada aos 10 backups mais recentes.

Depois de gerar uma build com `npm run build`, a próxima inicialização arquiva essa versão em `backend\database\Build-Backup\build-AAAA-MM-DD_HH-mm-ss-mmm`, usando a data e hora da geração. Cada build nova é arquivada uma única vez; reiniciar sem gerar outra build não duplica a cópia. Essas cópias não são removidas automaticamente nem enviadas nas atualizações.

Fechar a janela do inicializador fecha apenas aquela janela; não encerra Node.js, PostgreSQL nem outros serviços do computador.

## 9. Configure a rede

### Na máquina principal

1. No Dashboard, abra **Gerenciamento de Rede**.
2. Selecione a função **Principal**.
3. Confirme a porta `8081` e salve a configuração.
4. Descubra o endereço IPv4 usado na rede com:

   ```powershell
   ipconfig
   ```

   Use o IPv4 do adaptador Wi-Fi/cabo conectado à rede local.
5. Deixe o computador ligado e o Dashboard/servidor iniciado quando as secundárias precisarem consultar atualizações.
6. De uma secundária, teste `http://IP-DA-PRINCIPAL:8081/latest.json`. Deve aparecer um manifesto JSON, não uma página HTML.

### Em cada máquina secundária

1. Instale o Node.js, PostgreSQL e Dashboard e prepare o banco local conforme os passos anteriores.
2. No Dashboard, abra **Gerenciamento de Rede**.
3. Selecione a função **Secundária**.
4. Informe o IPv4 real da máquina principal, a porta `8081` e a origem `http://IP-DA-PRINCIPAL:8081/latest.json`.
5. Salve a configuração e teste **Descobrir principal**.
6. A máquina secundária verifica atualizações de programa ao abrir o Dashboard e periodicamente. Ao aceitar a atualização, clique em **Atualizar agora** e aprove a solicitação de administrador do Windows, se aparecer.

## 10. Problemas comuns

- **`node.exe` não encontrado:** instale Node.js LTS, feche/reabra o PowerShell e tente novamente.
- **`npm` não encontrado ou `Cannot find module`:** confirme Node/npm e execute `npm install --omit=dev` dentro de `backend`.
- **Serviço `postgresql-x64-17` não encontrado:** confirme a instalação do PostgreSQL 17 e o nome/estado do serviço.
- **Tabelas/colunas não encontradas ou erros SQL:** confira se restaurou um backup completo e compatível. O SQL `backend\database\init\01-create-schema.sql` está desatualizado e não prepara sozinho o banco usado pelo backend atual.
- **Erro de autenticação/conexão com o banco:** confira o serviço na porta 5432 e compare `DB_NAME`, `DB_USER` e `DB_PASSWORD` do arquivo `backend\.env` com o usuário/banco criados no PostgreSQL.
- **Porta 8081 ocupada:** não encerre processos Node indiscriminadamente. Identifique o serviço que usa a porta e feche ou reconfigure apenas esse serviço.
- **A secundária não acessa `latest.json`:** confirme que principal e secundária estão na mesma rede, que a principal está ligada e que o Firewall permite TCP 8081 na rede privada.
- **A atualização instala o código mas não muda os cadastros:** isso é esperado no fluxo atual; o atualizador não sincroniza bancos de dados.
- **Novos membros não aparecem em outra máquina:** configure nela a mesma integração Google Sheets e verifique a URL CSV, a URL do App da Web e o token, conforme o guia de sincronização.
- **Faltam fotos ou logos:** copie os arquivos locais autorizados separadamente. Eles são excluídos dos pacotes de atualização para proteger dados locais.

## Resumo

O `.exe` instala os arquivos do programa e configura acesso à porta 8081. Em uma máquina limpa, ainda é necessário instalar Node.js e PostgreSQL, instalar as dependências do backend, configurar o banco e o arquivo `backend\.env` e, se necessário, restaurar os dados. Não use o instalador como substituto de backup do banco.
