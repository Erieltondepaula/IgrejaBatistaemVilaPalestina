// Serviço de Sincronização com Google Sheets em Tempo Real
const axios = require('axios');
const logger = require('../config/logger');
const { randomUUID } = require('crypto');

class GoogleSheetsSync {
  constructor() {
    this.sheetUrl = this.normalizeSheetUrl(process.env.GOOGLE_SHEETS_URL || '');
    this.pendingPreviews = new Map();
  }

  normalizeSheetUrl(rawUrl) {
    if (!rawUrl) return '';

    const url = String(rawUrl).trim();
    if (!url) return '';

    if (/\/export\?/.test(url) || /\/pub\?/.test(url) || /gviz\/tq/.test(url)) {
      return url;
    }

    const spreadsheetMatch = url.match(/\/spreadsheets\/d\/([A-Za-z0-9-_]+)/);
    if (!spreadsheetMatch) {
      return url;
    }

    const spreadsheetId = spreadsheetMatch[1];
    const gidMatch = url.match(/[?&]gid=([^&]+)/i);
    const gidQuery = gidMatch ? `&gid=${encodeURIComponent(gidMatch[1])}` : '';

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidQuery}`;
  }

  /**
   * Busca dados da planilha do Google Sheets
   */
  async fetchSheetData() {
    try {
      logger.info('🔄 Buscando dados do Google Sheets...');
      
      const response = await axios.get(this.sheetUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Dashboard-Membros/1.0'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Erro ao buscar planilha: Status ${response.status}`);
      }

      const csvData = response.data;

      if (typeof csvData === 'string' && csvData.trim().startsWith('<!DOCTYPE html')) {
        throw new Error('A URL configurada não está apontando para um CSV público do Google Sheets. Configure GOOGLE_SHEETS_URL com a URL de exportação CSV ou publique a planilha.');
      }

      logger.info('✅ Dados baixados com sucesso do Google Sheets');
      
      return csvData;
    } catch (error) {
      logger.error(`❌ Erro ao buscar Google Sheets: ${error.message}`);
      throw new Error(`Falha ao conectar com Google Sheets: ${error.message}`);
    }
  }

  isWriteBackConfigured() {
    return Boolean(process.env.GOOGLE_SHEETS_WRITE_URL?.trim() && process.env.GOOGLE_SHEETS_SYNC_TOKEN?.trim());
  }

  async createOrFindMember(member) {
    const writeUrl = process.env.GOOGLE_SHEETS_WRITE_URL?.trim();
    const syncToken = process.env.GOOGLE_SHEETS_SYNC_TOKEN?.trim();
    if (!writeUrl || !syncToken) {
      throw new Error('Configure GOOGLE_SHEETS_WRITE_URL e GOOGLE_SHEETS_SYNC_TOKEN no backend\\.env para gravar na planilha.');
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(writeUrl);
    } catch {
      throw new Error('GOOGLE_SHEETS_WRITE_URL não contém uma URL válida.');
    }
    if (
      parsedUrl.protocol !== 'https:'
      || parsedUrl.hostname !== 'script.google.com'
      || !parsedUrl.pathname.startsWith('/macros/s/')
      || !parsedUrl.pathname.endsWith('/exec')
    ) {
      throw new Error('GOOGLE_SHEETS_WRITE_URL deve ser a URL HTTPS /exec de um Google Apps Script implantado.');
    }

    let response;
    try {
      response = await axios.post(writeUrl, {
        action: 'create-if-missing',
        token: syncToken,
        member
      }, { timeout: 30000 });
    } catch (error) {
      const details = error.response?.data?.error || error.message;
      throw new Error(`Não foi possível gravar o cadastro no Google Sheets: ${details}`);
    }

    if (response.data?.success !== true || !response.data.member) {
      throw new Error(response.data?.error || 'Google Apps Script não confirmou a gravação do cadastro.');
    }

    return {
      created: response.data.created === true,
      member: response.data.member
    };
  }

  /**
   * Converte CSV para array de objetos
   */
  parseCSV(csvData) {
    try {
      const text = String(csvData || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

      if (!text) {
        throw new Error('Planilha vazia ou sem dados');
      }

      const rows = this.parseCSVRows(text);

      if (rows.length < 2) {
        throw new Error('Planilha vazia ou sem dados');
      }

      const headers = rows[0].map((header, index) => this.normalizeHeader(header, index));
      const dataRows = rows.slice(1).map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] ?? '';
        });
        return obj;
      }).filter((row) => Object.values(row).some((value) => String(value).trim() !== ''));

      logger.info(`✅ CSV parseado: ${dataRows.length} registros encontrados`);
      return dataRows;
    } catch (error) {
      logger.error(`❌ Erro ao parsear CSV: ${error.message}`);
      throw new Error(`Erro ao processar dados da planilha: ${error.message}`);
    }
  }

  parseCSVRows(text) {
    const rows = [];
    let currentRow = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentValue += '"';
          i += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
        continue;
      }

      if (char === ',' && !insideQuotes) {
        currentRow.push(currentValue);
        currentValue = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !insideQuotes) {
        currentRow.push(currentValue);
        if (currentRow.some((value) => String(value).trim() !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentValue = '';
        continue;
      }

      currentValue += char;
    }

    if (currentValue || currentRow.length > 0) {
      currentRow.push(currentValue);
      if (currentRow.some((value) => String(value).trim() !== '')) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  normalizeHeader(value, index) {
    const label = String(value ?? '')
      .replace(/^\uFEFF/, '')
      .replace(/"/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const normalized = label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s_\-]/g, ' ')
      .replace(/\s+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();

    return normalized || `coluna_${index + 1}`;
  }

  normalizeKey(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  getRowValue(row, aliases = []) {
    if (!row || typeof row !== 'object') return '';

    const lookup = {};
    Object.keys(row).forEach((key) => {
      lookup[this.normalizeKey(key)] = row[key];
    });

    for (const alias of aliases) {
      const key = this.normalizeKey(alias);
      const value = lookup[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }

    return '';
  }

  normalizeSheetDate(value) {
    if (value === undefined || value === null || String(value).trim() === '') return '';
    const text = String(value).trim();
    const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
    }

    const brazilianMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (brazilianMatch) {
      return `${brazilianMatch[3]}-${String(brazilianMatch[2]).padStart(2, '0')}-${String(brazilianMatch[1]).padStart(2, '0')}`;
    }
    return text;
  }

  /**
   * Converte dados do Google Sheets para formato do banco
   */
  transformToMembers(data) {
    const MemberService = require('./MemberServicePostgreSQL');
    
    const membros = data.map((row, index) => {
      try {
        // Função auxiliar para converter Sim/Não
        const toBoolean = (val) => {
          if (!val) return false;
          const str = String(val).trim().toLowerCase();
          return str === 'sim' || str === 'true' || str === '1' || str === 's';
        };

        // Função para dividir nome
        const splitNome = (nomeCompleto) => {
          if (!nomeCompleto) return { nome: '', sobrenome: '' };
          const partes = String(nomeCompleto).trim().split(/\s+/);
          return {
            nome: partes[0] || '',
            sobrenome: partes.slice(1).join(' ') || ''
          };
        };

        // Função para normalizar sexo
        const normalizeSexo = (sexo) => {
          if (!sexo) return '';
          const s = String(sexo).trim().toLowerCase();
          if (s === 'masculino' || s === 'm') return 'M';
          if (s === 'feminino' || s === 'f') return 'F';
          if (s[0] === 'm') return 'M';
          if (s[0] === 'f') return 'F';
          return '';
        };

        const nomeCompleto = this.getRowValue(row, ['Nome', 'Nome Completo', 'nome', 'nome_completo']) || '';
        const { nome, sobrenome } = splitNome(nomeCompleto);
        const avatarUrl = this.getRowValue(row, ['avatar_url', 'Avatar URL', 'avatarUrl']) || '';

        return {
          id_externo: this.getRowValue(row, ['system_id', 'ID', 'Id', 'id', 'id_externo']),
          nome,
          sobrenome,
          nome_completo: nomeCompleto,
          data_nascimento: this.normalizeSheetDate(this.getRowValue(row, ['Data de Nascimento', 'data_nascimento', 'Data Nascimento', 'data_nasc'])),
          idade: parseInt(this.getRowValue(row, ['Idade', 'idade']), 10) || null,
          mes: this.getRowValue(row, ['Mês', 'mes', 'Mes']),
          telefone: this.getRowValue(row, ['Telefone', 'telefone', 'Celular', 'celular']),
          sexo: normalizeSexo(this.getRowValue(row, ['Sexo', 'sexo', 'Gênero', 'genero'])),
          observacoes: this.getRowValue(row, ['Observações', 'observacoes', 'Obs', 'observacao']),
          status_civil: this.getRowValue(row, ['Estado Civil', 'status_civil', 'Status Civil', 'status_civil']),
          conjuge: this.getRowValue(row, ['Cônjuge', 'conjuge', 'Nome Cônjuge', 'nome_conjuge']),
          parentesco: this.getRowValue(row, ['Parentesco', 'parentesco']),
          rua: this.getRowValue(row, ['Rua', 'rua', 'Endereço', 'endereco']),
          numero: this.getRowValue(row, ['Número', 'numero', 'Numero', 'numero_casa']),
          bairro: this.getRowValue(row, ['Bairro', 'bairro']),
          cidade: this.getRowValue(row, ['Cidade', 'cidade']),
          estado: this.getRowValue(row, ['Estado', 'estado', 'UF', 'uf']),
          cep: this.getRowValue(row, ['CEP', 'cep']),
          batizado: toBoolean(this.getRowValue(row, ['Batizado', 'batizado', 'Batizado?', 'batizado_?'])),
          membro: toBoolean(this.getRowValue(row, ['Membro', 'membro', 'É Membro?', 'e_membro'])),
          situacao_atual: this.getRowValue(row, ['Situação Atual', 'situacao_atual', 'Status', 'status']),
          lider: toBoolean(this.getRowValue(row, ['Líder', 'lider', 'É Líder?', 'e_lider', 'lider_'])),
          e_professor_ebq: toBoolean(this.getRowValue(row, ['Professor EBQ', 'e_professor_ebq', 'É Professor EBQ?', 'professor_ebq'])),
          faixa_etaria: this.getRowValue(row, ['Faixa Etária', 'faixa_etaria', 'Faixa Etaria', 'faixa_etaria_']),
          pequeno_grupo: toBoolean(this.getRowValue(row, ['Pequeno Grupo', 'pequeno_grupo', 'Está em um pequeno grupo ?', 'esta_em_um_pequeno_grupo', 'pequeno_grupo_'])),
          grupo: this.getRowValue(row, ['Grupo', 'grupo', 'Nome do Grupo', 'nome_do_grupo']),
          numerodomes: this.getRowValue(row, ['Número do Mês', 'numerodomes', 'NumerodoMes', 'numero_do_mes', 'numero_domes']),
          avatar_url: avatarUrl.toUpperCase() === 'NULL' ? '' : avatarUrl,
          ministro: toBoolean(this.getRowValue(row, ['Ministro', 'ministro', 'É Ministro?', 'e_ministro']))
        };
      } catch (error) {
        logger.error(`❌ Erro ao transformar linha ${index + 1}: ${error.message}`);
        return null;
      }
    }).filter(m => m !== null && m.nome); // Remove nulos e registros sem nome

    logger.info(`✅ ${membros.length} membros transformados para formato do banco`);
    return membros;
  }

  async getMembersFromSheet() {
    const csvData = await this.fetchSheetData();
    const parsedData = this.parseCSV(csvData);
    const invalidRows = parsedData.flatMap((row, index) => {
      const missingFields = ['batizado', 'membro', 'situacao_atual'].filter((field) => {
        const aliases = field === 'situacao_atual'
          ? ['Situação Atual', 'situacao_atual', 'Status', 'status']
          : [field === 'batizado' ? 'Batizado' : 'Membro', field];
        return String(this.getRowValue(row, aliases) ?? '').trim() === '';
      });
      if (missingFields.length === 0) return [];

      const name = this.getRowValue(row, ['Nome', 'Nome Completo', 'nome', 'nome_completo']);
      return [`Linha ${index + 2}${name ? ` (${name})` : ''}: ${missingFields.join(', ')}`];
    });

    if (invalidRows.length > 0) {
      throw new Error(`Preencha os campos obrigatórios da planilha Google Sheets:\n${invalidRows.join('\n')}`);
    }

    const members = this.transformToMembers(parsedData);
    if (members.length === 0) {
      throw new Error('Nenhum membro válido encontrado na planilha');
    }
    return members;
  }

  async previewSync() {
    const MemberService = require('./MemberServicePostgreSQL');
    const members = await this.getMembersFromSheet();
    const changes = [];
    let newMembers = 0;
    let updatedMembers = 0;
    let unchangedMembers = 0;

    for (const memberData of members) {
      const existingMember = await MemberService.findExistingMember(memberData);
      const memberChanges = MemberService.getImportFieldChanges(existingMember || {}, memberData);

      if (!existingMember) newMembers++;
      else if (memberChanges.length > 0) updatedMembers++;
      else unchangedMembers++;

      if (memberChanges.length > 0) {
        changes.push({
          nome: MemberService.getNomeCompleto(memberData),
          acao: existingMember ? 'atualizado' : 'novo',
          ultima_atualizacao: existingMember?.updated_at
            ? new Date(existingMember.updated_at).toISOString()
            : null,
          campos: memberChanges.map(change => ({
            campo: change.label,
            atual: change.currentValue,
            novo: change.newValue
          }))
        });
      }
    }

    const now = Date.now();
    for (const [id, preview] of this.pendingPreviews.entries()) {
      if (now - preview.createdAt > 15 * 60 * 1000) this.pendingPreviews.delete(id);
    }

    const previewId = randomUUID();
    this.pendingPreviews.set(previewId, { members, createdAt: now });

    return {
      sucesso: true,
      previewId,
      total_processados: members.length,
      novos: newMembers,
      atualizados: updatedMembers,
      sem_alteracao: unchangedMembers,
      alteracoes: changes
    };
  }

  async applyPreview(previewId) {
    const pendingPreview = this.pendingPreviews.get(previewId);
    if (!pendingPreview || Date.now() - pendingPreview.createdAt > 15 * 60 * 1000) {
      this.pendingPreviews.delete(previewId);
      throw new Error('A prévia expirou. Compare a planilha novamente antes de atualizar.');
    }

    const MemberService = require('./MemberServicePostgreSQL');
    const results = await MemberService.importMembers(pendingPreview.members);
    this.pendingPreviews.delete(previewId);

    return {
      sucesso: true,
      total_processados: pendingPreview.members.length,
      importados: results.filter(result => result.success && result.action === 'inserted').length,
      atualizados: results.filter(result => result.success && result.action === 'updated').length,
      erros: results.filter(result => !result.success),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Sincroniza dados completos da planilha com o banco
   */
  async syncToDatabase() {
    const MemberService = require('./MemberServicePostgreSQL');
    
    try {
      logger.info('🚀 Iniciando sincronização completa com Google Sheets...');
      const membros = await this.getMembersFromSheet();
      
      // 4. Importar para o banco (substitui tudo)
      logger.info(`📝 Importando ${membros.length} membros para o banco...`);
      const resultados = await MemberService.importMembers(membros);
      
      logger.info('✅ Sincronização concluída com sucesso!');
      
      return {
        sucesso: true,
        total_processados: membros.length,
        importados: resultados.importados || membros.length,
        atualizados: resultados.atualizados || 0,
        erros: resultados.erros || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ Erro na sincronização: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronização inteligente - apenas mudanças
   * (Para implementação futura - incremental)
   */
  async syncChangesOnly() {
    // TODO: Implementar sincronização incremental
    // Comparar com banco e atualizar apenas o que mudou
    logger.info('ℹ️ Sincronização incremental ainda não implementada');
    return this.syncToDatabase();
  }
}

module.exports = new GoogleSheetsSync();
