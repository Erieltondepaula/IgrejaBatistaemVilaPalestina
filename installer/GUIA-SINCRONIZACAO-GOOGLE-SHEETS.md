# Configuração da sincronização com Google Sheets

Este fluxo usa a planilha como referência em caso de conflito. A sincronização de leitura importa os dados da planilha para o PostgreSQL local; a criação de um membro pelo Dashboard grava primeiro na planilha e depois no PostgreSQL.

## O que é sincronizado

- **Novo cadastro pelo Dashboard:** o backend envia o cadastro ao Apps Script. Se a planilha já tiver uma linha com o mesmo nome e data de nascimento, ela não é sobrescrita; seus dados são usados para criar o registro local.
- **Alterações feitas na planilha:** o sincronizador importa os dados para o PostgreSQL periodicamente (a cada cinco minutos, com uma primeira tentativa após a inicialização).
- **Alterações ou exclusões feitas nas telas de gestão:** não são enviadas à planilha por esta integração. Para manter os dados consistentes, faça alterações na planilha. A planilha pode sobrescrever alterações locais na próxima importação.
- A atualização de programa pela rede não copia nem sincroniza bancos de dados.

Cada computador continua usando seu próprio PostgreSQL. Para que todos recebam as mesmas alterações da planilha, configure neles a mesma URL publicada e o mesmo Apps Script.

## 1. Publique a planilha para leitura

1. Abra a planilha e escolha **Arquivo → Compartilhar → Publicar na Web**.
2. Publique a aba que contém os membros no formato **CSV**.
3. Copie a URL de publicação e configure `GOOGLE_SHEETS_URL` no `backend\.env`. O repositório não contém URL de planilha; cada instalação configura a sua.

Essa publicação habilita a importação de leitura. Não use a URL CSV como URL de gravação.

## 2. Configure o Google Apps Script para gravação

1. Na planilha correta, abra **Extensões → Apps Script**.
2. Substitua o conteúdo do arquivo de script pelo conteúdo de [`google-sheets/Code.gs`](./google-sheets/Code.gs) e salve.
3. Em **Configurações do projeto → Propriedades do script**, crie:
   - `SPREADSHEET_ID`: o identificador entre `/d/` e `/edit` na URL da planilha.
   - `SHEET_NAME`: nome exato da aba com os membros (opcional; se omitido, usa a primeira aba).
   - `SYNC_TOKEN`: segredo aleatório forte. Gere um, por exemplo, com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Não reutilize senhas de usuários.
4. Selecione **Implantar → Nova implantação → App da Web**:
   - **Executar como:** sua conta.
   - **Quem pode acessar:** qualquer pessoa. O endpoint valida o `SYNC_TOKEN` antes de aceitar uma gravação.
5. Autorize o acesso solicitado pelo Google e conclua a implantação.
6. Copie a URL da implantação, que deve terminar em `/exec`.

Se editar o código depois, atualize a implantação do App da Web para que a URL execute a versão nova.

## 3. Configure cada backend

Edite `backend\.env` em cada computador e acrescente:

```dotenv
GOOGLE_SHEETS_WRITE_URL=https://script.google.com/macros/s/ID_DA_IMPLANTACAO/exec
GOOGLE_SHEETS_SYNC_TOKEN=COLE_AQUI_O_MESMO_SEGREDO_DAS_PROPRIEDADES_DO_SCRIPT
```

Use a URL real da implantação e o mesmo segredo configurado em `SYNC_TOKEN`. Se a planilha publicada não for a padrão do projeto, configure também:

```dotenv
GOOGLE_SHEETS_URL=URL_CSV_PUBLICADA_DA_PLANILHA
```

Não coloque essas configurações no código do navegador, não envie o arquivo `.env` por e-mail e não o inclua no instalador. O `.env` é local e não é substituído pelo atualizador. Reinicie o backend depois de salvar o arquivo.

## 4. Valide sem criar dados fictícios

Faça um cadastro real, autorizado e ainda inexistente, pela tela **Gestão de membros**. Confirme que:

1. O sistema informa que o cadastro foi salvo no PostgreSQL e no Google Sheets.
2. A linha aparece na aba configurada e contém um `system_id`.
3. A API e o banco local da máquina mostram o novo membro.
4. Nas outras máquinas configuradas para a mesma planilha, o membro aparece após a sincronização periódica.

Não use dados fictícios de pessoas na planilha de produção. Se o registro já existir na planilha, o script preserva os valores dela e o Dashboard usa esses valores; não cria uma linha duplicada pelo mesmo ID ou pela combinação nome/data de nascimento.

## Solução de problemas

- **“aguardando a configuração segura do Google Sheets” (HTTP 503):** confira se as duas variáveis `GOOGLE_SHEETS_WRITE_URL` e `GOOGLE_SHEETS_SYNC_TOKEN` estão no `backend\.env` e reinicie o backend.
- **Falha ao conectar ou URL inválida:** confirme que a URL copiada é HTTPS e termina em `/exec`, e que a implantação está acessível.
- **“Não autorizado”:** confira se o valor de `SYNC_TOKEN` nas propriedades do Apps Script é idêntico ao `GOOGLE_SHEETS_SYNC_TOKEN` no backend.
- **A gravação funciona, mas alterações da planilha não chegam ao banco:** confirme a URL CSV publicada em `GOOGLE_SHEETS_URL`, a aba e os cabeçalhos. O sincronizador precisa acessar a planilha para leitura.
- **Cadastro não concluído por campos obrigatórios:** informe nome completo, data de nascimento, sexo, batizado, membro e situação.
- **Não há atualização imediata:** a importação da planilha ocorre periodicamente; reiniciar o serviço agenda uma tentativa inicial após cerca de 30 segundos.
