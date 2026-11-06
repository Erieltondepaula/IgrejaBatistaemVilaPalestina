# Instalador e atualizador do Dashboard de Membros

Este diretório reúne os recursos independentes para preparar uma nova máquina e sincronizar versões futuras sem mexer na estrutura principal do sistema.

## Visão geral

- `installer.js`: copia a aplicação para uma pasta de destino, valida o ambiente e gera um manifesto de instalação.
- `updater.js`: compara a versão atual com a versão mais recente, grava backup antes de aplicar mudanças e preserva arquivos locais sensíveis.
- `manifest.js`: utilitário para gerar hashes SHA-256, localizar arquivos relevantes e montar o manifesto.
- `version-manifest.json`: registro de versão e lista de arquivos.

## Páginas de membros

- **Filtros e resultados** (`/`): os resultados aparecem somente após clicar em **Aplicar filtros** e correspondem aos critérios aplicados.
- **Gestão de membros** (`/membros`): lista os cadastros, oculta desligados inicialmente e permite exibi-los, criar, editar e remover membros. O cadastro aceita fotografia. Com a integração Google Sheets configurada, novos cadastros são gravados na planilha e no PostgreSQL.
- Para configurar a leitura e a gravação da planilha, siga o [Guia de sincronização com Google Sheets](./GUIA-SINCRONIZACAO-GOOGLE-SHEETS.md).

## Como usar

### Preparar uma máquina Windows do zero

O `DashboardMembrosSetup.exe` não instala Node.js/PostgreSQL nem configura ou copia o banco de dados. Em uma máquina nova, siga o [Manual de Instalação do Windows](./MANUAL-INSTALACAO-WINDOWS.md) antes de iniciar o Dashboard.

### Validar ambiente Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\verify-windows-environment.ps1
```

### Compilar instalador .exe com Inno Setup

```powershell
npm run installer:build
```

Sempre que alterar o sistema e quiser gerar um novo instalador, execute o comando acima na pasta do projeto. Ele atualiza a build da aplicação e recria `installer\DashboardMembrosSetup.exe` sem encerrar o sistema que estiver rodando.

### Instalar em outra máquina

```bash
node installer/installer.js --target "C:/DashboardMembros/NovaInstalacao" --version 1.0.0
```

### Visualizar a operação sem escrever arquivos

```bash
node installer/installer.js --target "C:/DashboardMembros/NovaInstalacao" --dry-run
```

### Atualizar uma instalação existente

ApÃ³s a instalaÃ§Ã£o, o pacote inclui um atalho de atualizaÃ§Ã£o:

- `AtualizarDashboard.bat`

Ele chama o updater com a pasta instalada como alvo e aceita argumentos opcionais:

```bash
AtualizarDashboard.bat --source-url http://localhost:8081/latest.json
AtualizarDashboard.bat --source "C:/DashboardMembros/Principal"
```

Ou via Node diretamente:

```bash
node installer/updater.js --source "C:/DashboardMembros/Principal" --target "C:/DashboardMembros/Cliente" --manifest "C:/DashboardMembros/Principal/installer/version-manifest.json"
```

### Publicar e servir atualizações pela rede local

Na máquina principal, sempre que houver uma nova versão:

```powershell
npm run build
npm run installer:publish -- --version 1.1.0
npm run installer:serve
```

`npm run build` marca uma identificação exclusiva na build gerada. Na próxima inicialização do Dashboard, essa build é arquivada uma única vez em `backend\database\Build-Backup`; reiniciar sem gerar outra build não cria uma cópia repetida.

O comando `npm run installer:build` também publica automaticamente o manifesto e os arquivos da versão do instalador, para que sejam incluídos no pacote. Incremente a versão a cada publicação. O servidor unificado entrega a aplicação e as atualizações pela porta `8081`; o manifesto fica em `http://IP_DA_MAQUINA_PRINCIPAL:8081/latest.json`. O instalador configura uma regra de entrada TCP 8081 limitada à sub-rede local. Para instalações existentes, execute novamente o instalador como administrador na máquina principal. O atalho `IniciarTudo.bat` já inicia esse servidor junto com o backend.

Ao iniciar, `IniciarTudo.bat` verifica o manifesto e substitui somente um servidor antigo `http-server` ou outra instância do servidor unificado que esteja ocupando a porta `8081`. Outros processos não são encerrados; se a porta estiver ocupada por um serviço desconhecido, a inicialização informa o PID para permitir uma correção segura.

### Gerenciamento de redes e máquina principal

O sistema também inclui uma área administrativa independente para gerenciamento de rede local, identificando:

- nome da máquina
- rede lógica
- identificador único da rede
- função da máquina (principal/secundária)
- endereço IP e porta
- pasta de distribuição
- origem da atualização

Essa configuração é persistida localmente e pode ser alterada sem impactar a aplicação principal.

### Avisos automáticos de atualização nas máquinas secundárias

Máquinas configuradas como **Secundária** verificam o manifesto da máquina principal ao abrir o sistema e a cada minuto. Quando há uma versão mais nova, o sistema pergunta se deseja atualizar. Ao aceitar, abre a tela **Atualização pela rede**; nela, clique em **Atualizar agora** e autorize o Windows se solicitar. A atualização usa o atualizador com backup e recarrega o painel ao terminar. Ao recusar, escolha quando deseja receber o aviso novamente.

Como a notificação automática foi introduzida na versão 1.0.9, instale o `DashboardMembrosSetup.exe` 1.0.9 uma vez em cada máquina secundária que ainda não tenha essa versão. A partir dela, as próximas versões podem ser detectadas e aplicadas pela tela de atualização.

## Regras de segurança

- O principal projeto não é modificado ao executar os scripts.
- Arquivos sensíveis como `.env`, `public/avatars`, `public/logos` e `backend/uploads` são preservados.
- Cada substituição gera backup dentro da pasta de instalação antes de aplicar a mudança.
- A comparação usa SHA-256 para identificar arquivos alterados de forma confiável.

## Observações

- Node.js, PostgreSQL 17, dependências do backend e configuração do banco são pré-requisitos manuais para uma máquina limpa; consulte o manual.
- Atualizações pela rede distribuem arquivos de programa, não bancos de dados, `.env`, fotos, logos ou uploads.
