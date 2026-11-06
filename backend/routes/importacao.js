// ROTAS DA API PARA IMPORTAÇÃO INTERATIVA
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ImportacaoInterativaService = require('../services/ImportacaoInterativaService');

const router = express.Router();
const importacaoService = new ImportacaoInterativaService();

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `importacao_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel (.xlsx, .xls) são permitidos'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// 1. Upload e análise inicial do arquivo
router.post('/upload-analise', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Nenhum arquivo foi enviado'
      });
    }

    console.log('📁 Arquivo recebido:', req.file.originalname);
    
    // Processar arquivo Excel
    const resultado = await importacaoService.processarArquivoExcel(req.file.path);
    
    if (!resultado.sucesso) {
      return res.status(400).json(resultado);
    }

    // Estatísticas rápidas
    const stats = {
      totalLinhas: resultado.totalLinhas,
      novosUsuarios: resultado.dados.filter(d => d.acao === 'criar_novo').length,
      atualizacoes: resultado.dados.filter(d => d.acao === 'confirmar_atualizacao').length,
      semAlteracao: resultado.dados.filter(d => d.acao === 'sem_alteracao').length
    };

    res.json({
      sucesso: true,
      dados: resultado.dados,
      estatisticas: stats,
      arquivoId: req.file.filename
    });

    // Limpar arquivo temporário após um tempo
    setTimeout(() => {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Arquivo temporário removido:', req.file.filename);
      } catch (err) {
        console.error('Erro ao remover arquivo:', err);
      }
    }, 300000); // 5 minutos

  } catch (error) {
    console.error('Erro na análise:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno do servidor: ' + error.message
    });
  }
});

// 2. Executar ação específica (criar, atualizar, ignorar)
router.post('/executar-acao', async (req, res) => {
  try {
    const { dadosLinha, acao } = req.body;

    if (!dadosLinha || !acao) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Dados da linha e ação são obrigatórios'
      });
    }

    const resultado = await importacaoService.executarAcao(dadosLinha, acao);
    
    res.json(resultado);

  } catch (error) {
    console.error('Erro ao executar ação:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno do servidor: ' + error.message
    });
  }
});

// 3. Processar lote de ações (para execução em massa)
router.post('/executar-lote', async (req, res) => {
  try {
    const { acoes } = req.body; // Array de { dadosLinha, acao }

    if (!Array.isArray(acoes)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Ações devem ser um array'
      });
    }

    const resultados = [];
    let sucessos = 0;
    let erros = 0;

    for (const item of acoes) {
      try {
        const resultado = await importacaoService.executarAcao(item.dadosLinha, item.acao);
        resultados.push({
          linha: item.dadosLinha.linha,
          resultado: resultado
        });

        if (resultado.sucesso) {
          sucessos++;
        } else {
          erros++;
        }

      } catch (error) {
        erros++;
        resultados.push({
          linha: item.dadosLinha.linha,
          resultado: {
            sucesso: false,
            erro: error.message
          }
        });
      }
    }

    res.json({
      sucesso: true,
      processados: acoes.length,
      sucessos: sucessos,
      erros: erros,
      resultados: resultados
    });

  } catch (error) {
    console.error('Erro no processamento em lote:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno do servidor: ' + error.message
    });
  }
});

// 4. Gerar código de referência para teste
router.post('/gerar-codigo', async (req, res) => {
  try {
    const { nomeCompleto } = req.body;

    if (!nomeCompleto) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Nome completo é obrigatório'
      });
    }

    const codigo = await importacaoService.gerarCodigoReferencia(nomeCompleto);

    res.json({
      sucesso: true,
      codigo: codigo
    });

  } catch (error) {
    console.error('Erro ao gerar código:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno do servidor: ' + error.message
    });
  }
});

// 5. Verificar status de um usuário
router.get('/verificar-usuario/:idExterno', async (req, res) => {
  try {
    const { idExterno } = req.params;
    
    const usuario = await importacaoService.verificarUsuarioExistente(idExterno);
    
    res.json({
      sucesso: true,
      existe: !!usuario,
      usuario: usuario
    });

  } catch (error) {
    console.error('Erro ao verificar usuário:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno do servidor: ' + error.message
    });
  }
});

// 6. IMPORTAÇÃO COMPLETA - Substitui tudo (novo método)
router.post('/importar-completo', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Nenhum arquivo foi enviado'
      });
    }

    console.log('📁 Iniciando importação completa:', req.file.originalname);
    
    // Usar o serviço de importação completa
    const resultado = await importacaoService.importarCompleto(req.file.path);
    
    // Limpar arquivo temporário
    try {
      fs.unlinkSync(req.file.path);
      console.log('🗑️ Arquivo temporário removido');
    } catch (err) {
      console.error('Erro ao remover arquivo:', err);
    }
    
    res.json(resultado);

  } catch (error) {
    console.error('Erro na importação completa:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro interno do servidor: ' + error.message
    });
  }
});

module.exports = router;