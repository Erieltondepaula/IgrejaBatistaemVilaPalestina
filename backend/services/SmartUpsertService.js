// ===================================
// SISTEMA DE UPSERT INTELIGENTE
// ===================================

/**
 * Sistema inteligente de importação que:
 * 1. Identifica membros existentes por múltiplos critérios
 * 2. Compara campo por campo
 * 3. Atualiza apenas campos diferentes
 * 4. PRESERVA avatar_url sempre
 */

async function smartUpsertMember(memberData) {
  const nomeCompleto = memberData.nomeCompleto || memberData.nome_completo || `${memberData.nome || ''} ${memberData.sobrenome || ''}`.trim();
  const dataNascimento = memberData.dataNascimento || memberData.data_nascimento;
  const telefone = memberData.telefone;
  const idExterno = memberData.idExterno || memberData.id_externo;

  // ==========================================
  // ETAPA 1: IDENTIFICAR MEMBRO EXISTENTE
  // ==========================================
  
  console.log(`🔍 Verificando se existe: ${nomeCompleto}`);
  
  // Critérios de identificação (em ordem de prioridade):
  // 1. Nome completo + data nascimento (mais confiável)
  // 2. Nome completo + telefone
  // 3. ID externo (se fornecido)
  
  let existingMember = null;
  
  // Critério 1: Nome + Data Nascimento
  if (nomeCompleto && dataNascimento) {
    const result1 = await db.query(
      'SELECT * FROM membros WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM($1)) AND data_nascimento = $2 LIMIT 1',
      [nomeCompleto, dataNascimento]
    );
    if (result1.length > 0) {
      existingMember = result1[0];
      console.log(`   ✅ Encontrado por nome+data: ${existingMember.id}`);
    }
  }
  
  // Critério 2: Nome + Telefone (se não encontrou ainda)
  if (!existingMember && nomeCompleto && telefone) {
    const result2 = await db.query(
      'SELECT * FROM membros WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM($1)) AND telefone = $2 LIMIT 1',
      [nomeCompleto, telefone]
    );
    if (result2.length > 0) {
      existingMember = result2[0];
      console.log(`   ✅ Encontrado por nome+telefone: ${existingMember.id}`);
    }
  }
  
  // Critério 3: ID Externo (se não encontrou ainda)
  if (!existingMember && idExterno) {
    const result3 = await db.query(
      'SELECT * FROM membros WHERE id_externo = $1 LIMIT 1',
      [idExterno]
    );
    if (result3.length > 0) {
      existingMember = result3[0];
      console.log(`   ✅ Encontrado por ID externo: ${existingMember.id}`);
    }
  }
  
  // ==========================================
  // ETAPA 2: INSERIR OU ATUALIZAR
  // ==========================================
  
  if (existingMember) {
    // MEMBRO EXISTE - FAZER UPDATE INTELIGENTE
    return await smartUpdateMember(existingMember, memberData);
  } else {
    // MEMBRO NÃO EXISTE - INSERIR NOVO
    return await insertNewMember(memberData);
  }
}

/**
 * Update inteligente que compara campo por campo
 * e atualiza apenas o que mudou
 */
async function smartUpdateMember(existingMember, newData) {
  console.log(`🔄 Atualizando membro existente: ${existingMember.nome_completo} (${existingMember.id})`);
  
  const updates = [];
  const updateValues = [];
  let paramIndex = 1;
  
  // Mapear campos novos para os campos do banco
  const fieldMapping = {
    'nome': newData.nome,
    'sobrenome': newData.sobrenome,
    'nome_completo': newData.nomeCompleto || newData.nome_completo || `${newData.nome || ''} ${newData.sobrenome || ''}`.trim(),
    'data_nascimento': newData.dataNascimento || newData.data_nascimento,
    'idade': newData.idade,
    'mes': newData.mes,
    'telefone': newData.telefone,
    'sexo': newData.sexo,
    'observacoes': newData.observacoes,
    'status_civil': newData.statusCivil || newData.status_civil,
    'conjuge': newData.conjuge,
    'parentesco': newData.parentesco,
    'rua': newData.rua,
    'numero': newData.numero,
    'bairro': newData.bairro,
    'cidade': newData.cidade,
    'estado': newData.estado,
    'cep': newData.cep,
    'batizado': newData.batizado,
    'membro': newData.membro,
    'situacao_atual': newData.situacaoAtual || newData.situacao_atual,
    'lider': newData.lider,
    'e_professor_ebq': newData.eProfessorEbq || newData.e_professor_ebq,
    'faixa_etaria': newData.faixaEtaria || newData.faixa_etaria,
    'pequeno_grupo': newData.pequenoGrupo || newData.pequeno_grupo,
    'grupo': newData.grupo,
    'numerodomes': newData.numeroDomes || newData.numerodomes,
    'id_externo': newData.idExterno || newData.id_externo
  };
  
  // Comparar cada campo
  for (const [fieldName, newValue] of Object.entries(fieldMapping)) {
    // NUNCA atualizar avatar_url via Excel - sempre preservar
    if (fieldName === 'avatar_url') continue;
    
    const currentValue = existingMember[fieldName];
    
    // Normalizar valores para comparação
    const normalizedNew = normalizeValue(newValue);
    const normalizedCurrent = normalizeValue(currentValue);
    
    // Se os valores são diferentes, adicionar ao update
    if (normalizedNew !== normalizedCurrent && normalizedNew !== null) {
      updates.push(`${fieldName} = $${paramIndex}`);
      updateValues.push(newValue);
      paramIndex++;
      
      console.log(`   📝 ${fieldName}: "${currentValue}" → "${newValue}"`);
    }
  }
  
  // Se não há atualizações, pular
  if (updates.length === 0) {
    console.log(`   ⏭️ Nenhuma alteração necessária - mantendo registro inalterado`);
    return {
      success: true,
      action: 'skipped',
      id: existingMember.id,
      message: 'Nenhuma alteração detectada'
    };
  }
  
  // Construir e executar query de update
  const updateSql = `
    UPDATE membros SET 
      ${updates.join(', ')},
      updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING id
  `;
  
  updateValues.push(existingMember.id);
  
  try {
    await db.execute(updateSql, updateValues);
    console.log(`   ✅ ${updates.length} campo(s) atualizado(s) com sucesso`);
    
    return {
      success: true,
      action: 'updated',
      id: existingMember.id,
      updatedFields: updates.length,
      message: `${updates.length} campo(s) atualizado(s)`
    };
  } catch (error) {
    console.error(`   ❌ Erro no update: ${error.message}`);
    return {
      success: false,
      action: 'error',
      error: error.message
    };
  }
}

/**
 * Inserir novo membro
 */
async function insertNewMember(memberData) {
  const nomeCompleto = memberData.nomeCompleto || memberData.nome_completo || `${memberData.nome || ''} ${memberData.sobrenome || ''}`.trim();
  
  console.log(`➕ Inserindo novo membro: ${nomeCompleto}`);
  
  try {
    // Gerar ID único
    const idResult = await db.query('SELECT gerar_id_compacto($1) as id', [nomeCompleto]);
    const generatedId = idResult[0].id;
    
    // SQL de inserção (SEM avatar_url - será null)
    const insertSql = `
      INSERT INTO membros (
        id, id_externo, nome, sobrenome, nome_completo, data_nascimento,
        idade, mes, telefone, sexo, observacoes, status_civil, conjuge,
        parentesco, rua, numero, bairro, cidade, estado, cep,
        batizado, membro, situacao_atual, lider, e_professor_ebq,
        faixa_etaria, pequeno_grupo, grupo, numerodomes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, NOW(), NOW()
      )
    `;
    
    const insertParams = [
      generatedId,
      memberData.idExterno || memberData.id_externo || null,
      memberData.nome || '',
      memberData.sobrenome || '',
      nomeCompleto,
      memberData.dataNascimento || memberData.data_nascimento,
      memberData.idade || null,
      memberData.mes || null,
      memberData.telefone || null,
      memberData.sexo || null,
      memberData.observacoes || null,
      memberData.statusCivil || memberData.status_civil || null,
      memberData.conjuge || null,
      memberData.parentesco || null,
      memberData.rua || null,
      memberData.numero || null,
      memberData.bairro || null,
      memberData.cidade || null,
      memberData.estado || null,
      memberData.cep || null,
      memberData.batizado || false,
      memberData.membro || false,
      memberData.situacaoAtual || memberData.situacao_atual || null,
      memberData.lider || false,
      memberData.eProfessorEbq || memberData.e_professor_ebq || false,
      memberData.faixaEtaria || memberData.faixa_etaria || null,
      memberData.pequenoGrupo || memberData.pequeno_grupo || false,
      memberData.grupo || null,
      memberData.numeroDomes || memberData.numerodomes || null
    ];
    
    await db.execute(insertSql, insertParams);
    console.log(`   ✅ Novo membro inserido com ID: ${generatedId}`);
    
    return {
      success: true,
      action: 'inserted',
      id: generatedId,
      message: 'Novo membro inserido com sucesso'
    };
    
  } catch (error) {
    console.error(`   ❌ Erro na inserção: ${error.message}`);
    return {
      success: false,
      action: 'error',
      error: error.message
    };
  }
}

/**
 * Normalizar valores para comparação
 */
function normalizeValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return value.trim();
  return value;
}

module.exports = {
  smartUpsertMember,
  smartUpdateMember,
  insertNewMember
};