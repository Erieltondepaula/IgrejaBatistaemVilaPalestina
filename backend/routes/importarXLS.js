// Rota Express para upload e conversão de XLS para formato do banco
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

function toBoolean(val) {
  if (typeof val === 'string') return val.trim().toLowerCase() === 'sim';
  return !!val;
}

function toRequiredBoolean(val) {
  if (val === undefined || val === null || String(val).trim() === '') return null;
  return toBoolean(val);
}

function splitNome(nome) {
  if (!nome) return { nome: '', sobrenome: '' };
  const partes = nome.trim().split(' ');
  return {
    nome: partes[0],
    sobrenome: partes.slice(1).join(' ')
  };
}

const MemberService = require('../services/MemberServicePostgreSQL');

router.post('/importar', upload.single('arquivo'), async (req, res) => {
  const logger = require('../config/logger');
  try {
    const filePath = req.file?.path;
    const originalName = req.file?.originalname || '';
    let data = [];
    if (!filePath) {
      logger.error('❌ Nenhum arquivo enviado na rota /importar.');
      throw new Error('Nenhum arquivo enviado.');
    }
    // Aceita por extensão ou tipo MIME
    const ext = originalName.split('.').pop().toLowerCase();
    if (['xlsx', 'xls'].includes(ext)) {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (ext === 'csv') {
      // Tenta ler como CSV
      try {
        const workbook = XLSX.readFile(filePath, { type: 'file', raw: true });
        const sheetName = workbook.SheetNames[0];
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } catch (csvErr) {
        logger.error(`❌ Erro ao ler CSV: ${csvErr.message}`);
        throw new Error('Erro ao processar arquivo CSV. Verifique o formato.');
      }
    } else {
      logger.error(`❌ Formato de arquivo não suportado: ${filePath} (${originalName})`);
      throw new Error('Formato de arquivo não suportado. Envie XLS, XLSX ou CSV.');
    }

    const membros = data.map(item => {
      const { nome, sobrenome } = splitNome(item.nome);
      return {
        id_externo: item.Id,
        nome,
        sobrenome,
        nome_completo: item['Nome Completo'],
        data_nascimento: item.data_nascimento,
        idade: item.idade,
        mes: item.mes,
        telefone: item.telefone,
        sexo: item.sexo,
        observacoes: item.observacoes,
        status_civil: item.status_civil,
        conjuge: item.nome_conjuge,
        parentesco: item.parentesco,
        rua: item.rua,
        numero: item.numero,
        bairro: item.bairro,
        cidade: item.cidade,
        estado: item.estado,
        cep: item.cep,
        batizado: toRequiredBoolean(item.batizado),
        membro: toRequiredBoolean(item.membro),
        situacao_atual: item.situacao_atual,
        lider: toBoolean(item.e_lider),
        e_professor_ebq: toBoolean(item.e_professor_ebq),
        faixa_etaria: item.faixa_etaria,
        pequeno_grupo: toBoolean(item['Está em um pequeno grupo ?']),
        grupo: item.grupo,
        numerodomes: item.numerodomes,
        avatar_url: item.avatar_url || item.avatarUrl || ''
      };
    });

    // Importa todos os membros no banco
    const resultados = await MemberService.importMembers(membros);
    logger.info(`📤 Arquivo importado com sucesso: ${filePath}, ${membros.length} membros processados.`);
    res.json({ sucesso: true, resultados });
  } catch (err) {
    logger.error(`❌ Erro ao importar arquivo: ${err.message}`);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
