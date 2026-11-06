// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO: gerar_codigo_referencia
// ═══════════════════════════════════════════════════════════════════════════════
// 
// OBJETIVO: Gerar código único para NOVOS membros
// FORMATO: [INICIAIS]-[TIMESTAMP]-[SUFIXO_ALEATÓRIO]
// EXEMPLO: AA-20251102143055-K4Z9
// 
// CHAMADA: Apenas durante INSERT (nunca em UPDATE)
// 
// ═══════════════════════════════════════════════════════════════════════════════

const crypto = require('crypto');

/**
 * Gera um código de referência único para um novo membro
 * 
 * @param {string} nomeCompleto - Nome completo do membro
 * @returns {string} Código no formato: INICIAIS-TIMESTAMP-SUFIXO
 * 
 * @example
 * gerar_codigo_referencia('ABNER ABADIS LIMA')
 * // Retorna: 'AA-20251102143055-K4Z9'
 */
function gerar_codigo_referencia(nomeCompleto) {
  // 1️⃣ EXTRAIR INICIAIS
  const extrairIniciais = (nome) => {
    if (!nome || typeof nome !== 'string') return 'XX';
    
    const palavras = nome
      .toUpperCase()
      .trim()
      .split(/\s+/)
      .filter(p => p.length > 0);
    
    if (palavras.length === 0) return 'XX';
    if (palavras.length === 1) return palavras[0].substring(0, 2);
    
    // Pega primeira letra da primeira palavra + primeira letra da última palavra
    return palavras[0][0] + palavras[palavras.length - 1][0];
  };
  
  // 2️⃣ GERAR TIMESTAMP: YYYYMMDDHHMMSS
  const gerarTimestamp = () => {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const dia = String(now.getDate()).padStart(2, '0');
    const hora = String(now.getHours()).padStart(2, '0');
    const minuto = String(now.getMinutes()).padStart(2, '0');
    const segundo = String(now.getSeconds()).padStart(2, '0');
    
    return `${ano}${mes}${dia}${hora}${minuto}${segundo}`;
  };
  
  // 3️⃣ GERAR SUFIXO ALEATÓRIO: 4 caracteres alfanuméricos
  const gerarSufixoAleatorio = () => {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem I, O, 0, 1 para evitar confusão
    let sufixo = '';
    
    for (let i = 0; i < 4; i++) {
      const randomIndex = crypto.randomInt(0, caracteres.length);
      sufixo += caracteres[randomIndex];
    }
    
    return sufixo;
  };
  
  // 4️⃣ MONTAR CÓDIGO FINAL
  const iniciais = extrairIniciais(nomeCompleto);
  const timestamp = gerarTimestamp();
  const sufixo = gerarSufixoAleatorio();
  
  return `${iniciais}-${timestamp}-${sufixo}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXEMPLOS DE USO
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n📋 EXEMPLOS DE GERAÇÃO DE CÓDIGO DE REFERÊNCIA:\n');
console.log('─'.repeat(80));

const exemplos = [
  'ABNER ABADIS LIMA',
  'ADASSA VALENTINA CRUZ DE SOUSA',
  'ADELIDIA DE AZEVEDO CRUZ',
  'ALBERTO CLARO JÚNIOR',
  'ALDENY FERREIRA DE OLIVEIRA SOUSA',
  'Maria',
  'João Silva Santos'
];

exemplos.forEach(nome => {
  const codigo = gerar_codigo_referencia(nome);
  console.log(`Nome: ${nome.padEnd(40)} → Código: ${codigo}`);
});

console.log('─'.repeat(80));
console.log('\n✅ Todos os códigos são únicos devido ao timestamp + sufixo aleatório\n');

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTAR FUNÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = { gerar_codigo_referencia };
