// Rotas para Sincronização com Google Sheets em Tempo Real
const express = require('express');
const router = express.Router();
const GoogleSheetsSync = require('../services/GoogleSheetsSync');
const logger = require('../config/logger');

/**
 * 🔄 POST /api/webhook/google-sheets
 * Recebe notificações em tempo real sem gravar dados no banco.
 * A importação exige prévia e confirmação pelo painel.
 */
router.post('/webhook/google-sheets', async (req, res) => {
  try {
    logger.info('🔔 Webhook recebido do Google Sheets');
    logger.info(`📋 Dados recebidos: ${JSON.stringify(req.body)}`);

    // Validar se é uma notificação legítima
    const { action, timestamp, sheetName } = req.body;
    
    if (!action || !timestamp) {
      logger.warn('⚠️ Webhook inválido - faltam campos obrigatórios');
      return res.status(400).json({
        sucesso: false,
        erro: 'Webhook inválido'
      });
    }

    // Responder imediatamente (200 OK) para o Google não reenviar.
    res.status(200).json({
      sucesso: true,
      mensagem: 'Notificação recebida. Nenhum dado foi alterado; confirme as atualizações pelo painel.'
    });

  } catch (error) {
    logger.error(`❌ Erro ao processar webhook: ${error.message}`);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * 🔄 POST /api/sync/google-sheets
 * Compatibilidade com clientes antigos: apenas gera prévia, sem gravar.
 */
router.post('/sync/google-sheets', async (req, res) => {
  try {
    logger.info('🔎 Prévia manual solicitada por cliente legado');

    const resultado = await GoogleSheetsSync.previewSync();

    res.json({
      ...resultado,
      mensagem: 'Prévia pronta. Confirme as alterações pelo painel para gravar.'
    });

  } catch (error) {
    logger.error(`❌ Erro na sincronização manual: ${error.message}`);
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      mensagem: error.message || 'Falha ao sincronizar com Google Sheets'
    });
  }
});

/**
 * Compara a planilha com o banco sem alterar nenhum cadastro.
 */
router.post('/sync/google-sheets/preview', async (req, res) => {
  try {
    const resultado = await GoogleSheetsSync.previewSync();
    res.json(resultado);
  } catch (error) {
    logger.error(`❌ Erro ao comparar Google Sheets: ${error.message}`);
    res.status(400).json({ sucesso: false, mensagem: error.message });
  }
});

/**
 * Aplica somente a prévia que o usuário confirmou.
 */
router.post('/sync/google-sheets/apply', async (req, res) => {
  try {
    const { previewId } = req.body;
    if (!previewId) {
      return res.status(400).json({ sucesso: false, mensagem: 'A prévia de sincronização é obrigatória.' });
    }

    const resultado = await GoogleSheetsSync.applyPreview(previewId);
    res.json({ ...resultado, mensagem: 'Atualizações aplicadas com sucesso.' });
  } catch (error) {
    logger.error(`❌ Erro ao aplicar prévia do Google Sheets: ${error.message}`);
    res.status(400).json({ sucesso: false, mensagem: error.message });
  }
});

/**
 * 🧪 GET /api/sync/google-sheets/test
 * Testa a conexão com o Google Sheets sem importar
 */
router.get('/sync/google-sheets/test', async (req, res) => {
  try {
    logger.info('🧪 Testando conexão com Google Sheets...');

    const csvData = await GoogleSheetsSync.fetchSheetData();
    const parsedData = GoogleSheetsSync.parseCSV(csvData);
    const membros = GoogleSheetsSync.transformToMembers(parsedData);

    res.json({
      sucesso: true,
      conexao_ok: true,
      total_registros: membros.length,
      preview: membros.slice(0, 3), // Mostra apenas 3 primeiros
      mensagem: 'Conexão OK! Planilha acessível e parseável.'
    });

  } catch (error) {
    logger.error(`❌ Erro no teste de conexão: ${error.message}`);
    res.status(500).json({
      sucesso: false,
      conexao_ok: false,
      erro: error.message,
      mensagem: 'Falha ao conectar com Google Sheets'
    });
  }
});

/**
 * 📊 GET /api/sync/google-sheets/status
 * Retorna informações sobre última sincronização
 */
router.get('/sync/google-sheets/status', async (req, res) => {
  try {
    // TODO: Implementar tabela de logs de sincronização
    // Por enquanto, retorna status básico
    
    res.json({
      sucesso: true,
      configurado: true,
      url_planilha: 'Configurada ✅',
      webhook_ativo: true,
      ultima_sincronizacao: 'Não implementado ainda',
      mensagem: 'Sistema de sincronização ativo'
    });

  } catch (error) {
    logger.error(`❌ Erro ao buscar status: ${error.message}`);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

module.exports = router;
