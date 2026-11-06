// 🔄 Serviço de Sincronização Automática em Background
// Executa periodicamente para detectar novos cadastros do Google Forms via Google Sheets

const logger = require('../config/logger');
const GoogleSheetsSync = require('./GoogleSheetsSync');
const MemberService = require('./MemberServicePostgreSQL');

class AutoSyncService {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.lastSyncResult = null;
    this.syncHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Inicia o serviço de sincronização automática
   * @param {number} intervalMinutes - Intervalo em minutos (padrão: 5)
   */
  start(intervalMinutes = 5) {
    if (this.syncInterval) {
      logger.warn('⚠️ Serviço de sincronização já está rodando');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    logger.info(`🚀 Iniciando sincronização automática a cada ${intervalMinutes} minutos`);

    // Executar primeira sincronização após 30 segundos
    setTimeout(() => this.runSync(), 30000);

    // Agendar sincronizações periódicas
    this.syncInterval = setInterval(() => {
      this.runSync();
    }, intervalMs);
  }

  /**
   * Para o serviço de sincronização automática
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('🛑 Serviço de sincronização automática parado');
    }
  }

  /**
   * Executa uma sincronização única
   */
  async runSync() {
    if (this.isRunning) {
      logger.info('⏳ Sincronização já em andamento, pulando...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('🔄 [AutoSync] Iniciando sincronização automática...');

      // 1. Buscar dados da planilha
      const members = await GoogleSheetsSync.getMembersFromSheet();
      
      if (!members || members.length === 0) {
        logger.info('📭 [AutoSync] Nenhum registro encontrado na planilha');
        this.recordSyncResult({
          success: true,
          total: 0,
          new: 0,
          updated: 0,
          errors: 0,
          message: 'Planilha vazia',
          duration: Date.now() - startTime
        });
        return;
      }

      // 2. Comparar com banco e processar apenas novos/alterados
      const results = await MemberService.importMembers(members);
      
      const stats = {
        total: members.length,
        new: results.filter(r => r.success && r.action === 'inserted').length,
        updated: results.filter(r => r.success && r.action === 'updated').length,
        skipped: results.filter(r => r.success && r.action === 'skipped').length,
        errors: results.filter(r => !r.success).length
      };

      logger.info(`✅ [AutoSync] Concluído: ${stats.new} novos, ${stats.updated} atualizados, ${stats.skipped} iguais, ${stats.errors} erros`);

      this.recordSyncResult({
        success: stats.errors === 0,
        total: stats.total,
        new: stats.new,
        updated: stats.updated,
        skipped: stats.skipped,
        errors: stats.errors,
        message: stats.errors > 0 ? 'Alguns registros falharam' : 'Sincronização concluída',
        duration: Date.now() - startTime,
        details: results.filter(r => !r.success).map(r => ({
          member: r.member?.nome_completo,
          error: r.error
        }))
      });

      return stats;

    } catch (error) {
      logger.error(`❌ [AutoSync] Erro na sincronização: ${error.message}`);
      
      this.recordSyncResult({
        success: false,
        total: 0,
        new: 0,
        updated: 0,
        errors: 1,
        message: error.message,
        duration: Date.now() - startTime
      });

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Registra resultado da sincronização no histórico
   */
  recordSyncResult(result) {
    const entry = {
      ...result,
      timestamp: new Date().toISOString()
    };

    this.lastSyncResult = entry;
    this.syncHistory.unshift(entry);

    // Manter apenas os últimos N registros
    if (this.syncHistory.length > this.maxHistorySize) {
      this.syncHistory = this.syncHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Obtém status atual do serviço
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalActive: !!this.syncInterval,
      lastSync: this.lastSyncResult,
      history: this.syncHistory.slice(0, 20)
    };
  }

  /**
   * Força uma sincronização manual
   */
  async forceSync() {
    logger.info('🔧 [AutoSync] Sincronização manual forçada');
    return this.runSync();
  }

  /**
   * Obtém cadastros pendentes (novos na planilha que não estão no banco)
   */
  async getPendingRegistrations() {
    try {
      const members = await GoogleSheetsSync.getMembersFromSheet();
      const pending = [];

      for (const memberData of members) {
        const existingMember = await MemberService.findExistingMember(memberData);
        
        if (!existingMember) {
          pending.push({
            id_externo: memberData.id_externo,
            nome_completo: MemberService.getNomeCompleto(memberData),
            data_nascimento: memberData.data_nascimento,
            telefone: memberData.telefone,
            email: memberData.email,
            situacao_atual: memberData.situacao_atual,
            received_at: new Date().toISOString(),
            status: 'novo'
          });
        } else {
          const changes = MemberService.getImportFieldChanges(existingMember, memberData);
          if (changes.length > 0) {
            pending.push({
              id_externo: memberData.id_externo,
              nome_completo: MemberService.getNomeCompleto(memberData),
              data_nascimento: memberData.data_nascimento,
              telefone: memberData.telefone,
              email: memberData.email,
              situacao_atual: memberData.situacao_atual,
              received_at: new Date().toISOString(),
              status: 'alterado',
              changes: changes.map(c => ({ campo: c.label, atual: c.currentValue, novo: c.newValue }))
            });
          }
        }
      }

      return pending;
    } catch (error) {
      logger.error(`❌ [AutoSync] Erro ao buscar pendentes: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AutoSyncService();