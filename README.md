# Igreja Batista em Vila Palestina - Dashboard de Membros

Aplicação web para gestão de membros, desenvolvida com React, TypeScript, Vite e uma API Node.js com PostgreSQL.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 15 ou superior
- Windows PowerShell para os scripts de instalação e inicialização do Windows

## Configuração

1. Instale as dependências do frontend na raiz:

   ```powershell
   npm install
   ```

2. Instale as dependências da API:

   ```powershell
   cd backend
   npm install
   ```

3. Crie `backend\.env` a partir de [`backend/.env.example`](./backend/.env.example) e configure a conexão PostgreSQL. Não compartilhe nem versione esse arquivo.
4. Inicialize o esquema do banco usando [`backend/database/init/01-create-schema.sql`](./backend/database/init/01-create-schema.sql) em um banco vazio.
5. Gere os arquivos do painel e inicie a API:

   ```powershell
   cd ..
   npm run build
   cd backend
   npm start
   ```

O painel gerado fica em `dist`. Os scripts do instalador, servidor de atualização e integração com Google Sheets estão documentados em [`installer/README.md`](./installer/README.md) e [`installer/MANUAL-INSTALACAO-WINDOWS.md`](./installer/MANUAL-INSTALACAO-WINDOWS.md).

## Dados e privacidade

Fotos de membros, planilhas, credenciais, dados exportados e backups da instalação não fazem parte deste repositório. Configure suas próprias credenciais localmente e armazene os backups em um local protegido.

## Gerar e arquivar uma build

Execute `npm run build` para criar uma build. Na próxima inicialização pelo script de serviços, uma build nova pode ser arquivada localmente em `backend\database\Build-Backup`; cópias locais não são publicadas.
