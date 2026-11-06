// Rotas para Sincronização Automática em Background
const express = require('express');
const router = express.Router();
const AutoSyncService = require('../services/AutoSyncService');
const logger = require('../config/logger');

/**
 * 🔄 GET /api/sync/status
 * Retorna status do serviço de sincronização automática
 */
router.get('/status', async (req, res) => {
  try {
    const status = AutoSyncService.getStatus();
    res.json({
      sucesso: true,
      ...status
    });
  } catch (error) {
    logger.error(`❌ Erro ao buscar status de sincronização: ${error.message}`);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * 🔄 POST /api/sync/start
 * Inicia o serviço de sincronização automática
 */
router.post('/start', async (req, res) => {
  try {
    const { intervalMinutes = 5 } = req.body;
    AutoSyncService.start(intervalMinutes);
    
    res.json({
      sucesso: true,
      mensagem: `Sincronização automática iniciada (intervalo: ${intervalMinutes} min)`
    });
  } catch (error) {
    logger.error(`❌ Erro ao iniciar sincronização: ${error.message}`);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * 🔄 POST /api/sync/stop
 * Para o serviço de sincronização automática
 */
router.post('/stop', async (req, res) => {
  try {
    AutoSyncService.stop();
    res.json({
      sucesso: true,
      mensagem: 'Sincronização automática parada'
    });
  } catch (error) {
    logger.error(`❌ Erro ao parar sincronização: ${error.message}`);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * 🔄 POST /api/sync/force
 * Força uma sincronização manual imediata
 */
router.post('/force', async (req, res) => {
  try {
    const resultado = await AutoSyncService.forceSync();
    res.json({
      sucesso: true,
      ...resultado,
      mensagem: 'Sincronização manual concluída'
    });
  } catch (error) {
    logger.error(`❌ Erro na sincronização forçada: ${error.message}`);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * 📋 GET /api/sync/pending
 * Retorna cadastros pendentes (novos ou alterados na planilha)
 */
router.get('/pending', async (req, res) => {
  try {
    const pendentes = await AutoSyncService.getPendingRegistrations();
    res.json({
      sucesso: true,
      total: pendentes.length,
      pendentes
    });
  } catch (error) {
    logger.error(`❌ Erro ao buscar pendentes: ${error.message}`);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * 📋 GET /api/sync/history
 * Retorna histórico de sincronizações
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const status = AutoSyncService.getStatus();
    
    res.json({
      sucesso: true,
      historico: status.history.slice(0, parseInt(limit))
    });
  } catch (error) {
    logger.error(`❌ Erro ao buscar histórico: ${error.message}`);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * 🧪 GET /api/sync/test
 * Testa a conexão com Google Sheets
 */
router.get('/test', async (req, res) => {
  try {
    logger.info('🧪 Testando conexão com Google Sheets via AutoSync...');
    
    const members = await AutoSyncService.getPendingRegistrations();
    
    res.json({
      sucesso: true,
      conexao_ok: true,
      total_registros_planilha: members.length,
      mensagem: 'Conexão OK! Planilha acessível.'
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

module.exports = router;