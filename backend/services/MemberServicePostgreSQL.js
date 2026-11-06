const db = require('../config/postgresql');

class MemberServicePostgreSQL {

  getMissingRequiredFields(memberData) {
    const situation = memberData.situacao_atual ?? memberData.situacaoAtual ?? memberData.status;
    const requiredValues = {
      batizado: memberData.batizado,
      membro: memberData.membro,
      situacao_atual: situation
    };

    return Object.entries(requiredValues)
      .filter(([, value]) => value === undefined || value === null || String(value).trim() === '')
      .map(([field]) => field);
  }

  validateRequiredFields(memberData) {
    const missingFields = this.getMissingRequiredFields(memberData);
    if (missingFields.length > 0) {
      throw new Error(`Preencha os campos obrigatórios: ${missingFields.join(', ')}`);
    }
  }
  
  async getAllMembers() {
    const sql = `SELECT * FROM membros ORDER BY nome_completo`;
    
    try {
      const results = await db.query(sql);
      return results;
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
      throw error;
    }
  }

  async getMemberById(id) {
    const sql = `SELECT * FROM membros WHERE id = $1`;
    
    try {
      const results = await db.query(sql, [id]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Erro ao buscar membro ${id}:`, error);
      throw error;
    }
  }

  async importMembers(membersArray) {
    const invalidRows = membersArray.flatMap((member, index) => {
      const missingFields = this.getMissingRequiredFields(member);
      if (missingFields.length === 0) return [];
      const name = this.getNomeCompleto(member);
      const rowLabel = name ? ` (${name})` : '';
      return [`Linha ${index + 2}${rowLabel}: ${missingFields.join(', ')}`];
    });

    if (invalidRows.length > 0) {
      throw new Error(`Preencha os campos obrigatórios antes de importar:\n${invalidRows.join('\n')}`);
    }

    console.log(`IMPORTACAO INTELIGENTE: ${membersArray.length} membros`);
    console.log(`Preservando avatars e atualizando apenas campos diferentes...`);
    
    const results = [];
    const stats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
    
    try {
      for (let i = 0; i < membersArray.length; i++) {
        const memberData = membersArray[i];
        const nomeCompleto = this.getNomeCompleto(memberData);
        
        console.log(`[${i + 1}/${membersArray.length}] ${nomeCompleto}`);
        
        try {
          const existingMember = await this.findExistingMember(memberData);
          
          if (existingMember) {
            const updateResult = await this.updateIfDifferent(existingMember, memberData);
            results.push(updateResult);
            
            if (updateResult.action === 'updated') stats.updated++;
            else stats.skipped++;
            
          } else {
            const insertResult = await this.insertNewMember(memberData);
            results.push(insertResult);
            stats.inserted++;
          }
          
        } catch (error) {
          console.error(`  Erro: ${error.message}`);
          results.push({
            success: false,
            action: 'error',
            error: error.message,
            member: { nome_completo: nomeCompleto }
          });
          stats.errors++;
        }
        
        if (i < membersArray.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 25));
        }
      }
      
      console.log(`RESULTADO: +${stats.inserted} ~${stats.updated} =${stats.skipped} X${stats.errors}`);
      return results;
      
    } catch (error) {
      console.error('Erro na importacao:', error);
      throw error;
    }
  }

  async findExistingMember(memberData) {
    const nomeCompleto = this.getNomeCompleto(memberData);
    const dataNascimento = memberData.dataNascimento || memberData.data_nascimento;
    const telefone = memberData.telefone;
    const idExterno = memberData.idExterno || memberData.id_externo;

    if (nomeCompleto && dataNascimento) {
      const result = await db.query(
        'SELECT * FROM membros WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM($1)) AND data_nascimento = $2 LIMIT 1',
        [nomeCompleto, dataNascimento]
      );
      if (result.length > 0) {
        console.log(`  Encontrado por nome+data: ${result[0].id}`);
        return result[0];
      }
    }
    
    if (nomeCompleto && telefone && telefone.length >= 8) {
      const result = await db.query(
        'SELECT * FROM membros WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM($1)) AND telefone = $2 LIMIT 1',
        [nomeCompleto, telefone]
      );
      if (result.length > 0) {
        console.log(`  Encontrado por nome+telefone: ${result[0].id}`);
        return result[0];
      }
    }
    
    if (idExterno) {
      const result = await db.query(
        'SELECT * FROM membros WHERE id_externo = $1 LIMIT 1',
        [idExterno]
      );
      if (result.length > 0) {
        console.log(`  Encontrado por ID externo: ${result[0].id}`);
        return result[0];
      }
    }
    
    console.log(`  Nao encontrado - sera inserido`);
    return null;
  }

  getImportFieldValues(newData) {
    return {
      id_externo: newData.idExterno || newData.id_externo,
      nome: newData.nome,
      sobrenome: newData.sobrenome,
      nome_completo: this.getNomeCompleto(newData),
      data_nascimento: newData.dataNascimento || newData.data_nascimento,
      idade: newData.idade,
      telefone: newData.telefone,
      sexo: newData.sexo,
      observacoes: newData.observacoes,
      status_civil: newData.statusCivil || newData.status_civil,
      conjuge: newData.conjuge,
      parentesco: newData.parentesco,
      rua: newData.rua,
      numero: newData.numero,
      bairro: newData.bairro,
      cidade: newData.cidade,
      estado: newData.estado,
      cep: newData.cep,
      batizado: newData.batizado,
      membro: newData.membro,
      situacao_atual: newData.situacaoAtual || newData.situacao_atual,
      lider: newData.lider,
      e_professor_ebq: newData.eProfessorEbq || newData.e_professor_ebq,
      faixa_etaria: newData.faixaEtaria || newData.faixa_etaria,
      pequeno_grupo: newData.pequenoGrupo || newData.pequeno_grupo,
      grupo: newData.grupo,
      numerodomes: newData.numeroDomes || newData.numerodomes,
      avatar_url: newData.avatarUrl || newData.avatar_url,
      ministro: newData.ministro
    };
  }

  getImportFieldChanges(existingMember, newData) {
    const labels = {
      id_externo: 'ID externo',
      nome: 'Nome',
      sobrenome: 'Sobrenome',
      nome_completo: 'Nome completo',
      data_nascimento: 'Data de nascimento',
      idade: 'Idade',
      telefone: 'Telefone',
      sexo: 'Sexo',
      observacoes: 'Observações',
      status_civil: 'Estado civil',
      conjuge: 'Cônjuge',
      parentesco: 'Parentesco',
      rua: 'Rua',
      numero: 'Número',
      bairro: 'Bairro',
      cidade: 'Cidade',
      estado: 'Estado',
      cep: 'CEP',
      batizado: 'Batizado',
      membro: 'Membro',
      situacao_atual: 'Situação atual',
      lider: 'Líder',
      e_professor_ebq: 'Professor EBQ',
      faixa_etaria: 'Faixa etária',
      pequeno_grupo: 'Pequeno grupo',
      grupo: 'Grupo',
      numerodomes: 'Número do mês',
      avatar_url: 'Foto',
      ministro: 'Ministro'
    };

    return Object.entries(this.getImportFieldValues(newData)).flatMap(([column, newValue]) => {
      const currentValue = existingMember[column];
      const normalizedNew = this.normalizeImportFieldValue(column, newValue);
      const normalizedCurrent = this.normalizeImportFieldValue(column, currentValue);

      if (normalizedNew === null || normalizedNew === normalizedCurrent) return [];

      return [{
        column,
        label: labels[column] || column,
        currentValue: currentValue ?? null,
        newValue
      }];
    });
  }

  normalizeImportFieldValue(column, value) {
    if (column === 'data_nascimento') {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
      }
      const text = this.normalizeValue(value);
      if (text === null) return null;
      const isoMatch = String(text).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
      }
      const brazilianMatch = String(text).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (brazilianMatch) {
        return `${brazilianMatch[3]}-${String(brazilianMatch[2]).padStart(2, '0')}-${String(brazilianMatch[1]).padStart(2, '0')}`;
      }
      return text;
    }

    if (column === 'idade' || column === 'numerodomes') {
      const text = this.normalizeValue(value);
      if (text === null) return null;
      const number = Number(text);
      return Number.isNaN(number) ? text : number;
    }

    return this.normalizeValue(value);
  }

  async updateIfDifferent(existingMember, newData) {
    const updates = [];
    const updateValues = [];
    let paramIndex = 1;

    for (const change of this.getImportFieldChanges(existingMember, newData)) {
      updates.push(`${change.column} = $${paramIndex}`);
      updateValues.push(change.newValue);
      paramIndex++;
      console.log(`    Campo ${change.column}: "${change.currentValue}" -> "${change.newValue}"`);
    }
    
    if (updates.length === 0) {
      console.log(`    Nenhuma alteracao necessaria`);
      return {
        success: true,
        action: 'skipped',
        id: existingMember.id,
        member: { nome_completo: existingMember.nome_completo }
      };
    }
    
    const updateSql = `UPDATE membros SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id`;
    updateValues.push(existingMember.id);
    
    try {
      await db.execute(updateSql, updateValues);
      console.log(`    ${updates.length} campo(s) atualizado(s) - avatar preservado`);
      
      return {
        success: true,
        action: 'updated',
        id: existingMember.id,
        member: { nome_completo: existingMember.nome_completo },
        updatedFields: updates.length
      };
    } catch (error) {
      console.error(`    Erro no update: ${error.message}`);
      throw error;
    }
  }

  async insertNewMember(memberData) {
    this.validateRequiredFields(memberData);
    const nomeCompleto = this.getNomeCompleto(memberData);
    
    try {
      const idResult = await db.query('SELECT gerar_id_compacto($1) as id', [nomeCompleto]);
      const generatedId = idResult[0].id;
      
      console.log(`    Novo ID: ${generatedId}`);
      
      const insertSql = `INSERT INTO membros (
        id, id_externo, nome, sobrenome, nome_completo, data_nascimento,
        idade, mes, telefone, sexo, observacoes, status_civil, conjuge,
        parentesco, rua, numero, bairro, cidade, estado, cep,
        batizado, membro, situacao_atual, lider, e_professor_ebq,
        faixa_etaria, pequeno_grupo, grupo, numerodomes, avatar_url, ministro,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, NOW(), NOW()
      ) RETURNING id`;
      
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
        memberData.numeroDomes || memberData.numerodomes || null,
        memberData.avatarUrl || memberData.avatar_url || null,
        memberData.ministro || false
      ];
      
      await db.execute(insertSql, insertParams);
      console.log(`    Inserido (avatar pode ser adicionado via UI)`);
      
      return {
        success: true,
        action: 'inserted',
        id: generatedId,
        member: { nome_completo: nomeCompleto }
      };
      
    } catch (error) {
      console.error(`    Erro na insercao: ${error.message}`);
      throw error;
    }
  }

  async updateMember(id, memberData) {
    this.validateRequiredFields(memberData);
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    // Mapeamento de campos camelCase para snake_case
    const fieldMapping = {
      'nomeCompleto': 'nome_completo',
      'dataNascimento': 'data_nascimento',
      'statusCivil': 'status_civil',
      'situacaoAtual': 'situacao_atual',
      'professorEBQ': 'e_professor_ebq',
      'eProfessorEbq': 'e_professor_ebq',
      'faixaEtaria': 'faixa_etaria',
      'pequenoGrupo': 'pequeno_grupo',
      'numeroDomes': 'numerodomes',
      'motivoDesligamento': 'motivo_desligamento',
      'dataDesligamento': 'data_desligamento',
      'dataBatismo': 'data_batismo',
      'idExterno': 'id_externo',
      'avatarUrl': 'avatar_url',
      'avatar_url': 'avatar_url'
    };
    
    // Normalizar dados recebidos para snake_case
    const normalizedData = {};
    for (const [key, value] of Object.entries(memberData)) {
      const dbFieldName = fieldMapping[key] || key;
      normalizedData[dbFieldName] = value;
    }
    
    const allowedFields = [
      'nome', 'sobrenome', 'nome_completo', 'data_nascimento', 'idade', 
      'telefone', 'sexo', 'observacoes', 'status_civil', 'conjuge', 
      'parentesco', 'rua', 'numero', 'bairro', 'cidade', 'estado', 'cep',
      'batizado', 'membro', 'situacao_atual', 'lider', 'e_professor_ebq',
      'faixa_etaria', 'pequeno_grupo', 'grupo', 'numerodomes', 'avatar_url',
      'motivo_desligamento', 'data_desligamento', 'data_batismo'
    ];
    
    for (const field of allowedFields) {
      if (normalizedData.hasOwnProperty(field)) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(normalizedData[field]);
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }
    
    updateFields.push(`updated_at = NOW()`);
    
    const sql = `UPDATE membros SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    values.push(id);
    
    try {
      const result = await db.execute(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error(`Erro ao atualizar membro ${id}:`, error);
      throw error;
    }
  }

  async deleteMember(id) {
    try {
      const result = await db.execute('DELETE FROM membros WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Erro ao deletar membro ${id}:`, error);
      throw error;
    }
  }

  async getStatistics() {
    const sql = `SELECT COUNT(*) as total_membros,
      COUNT(*) FILTER (WHERE situacao_atual = 'ativo') as membros_ativos,
      COUNT(*) FILTER (WHERE sexo = 'M') as homens,
      COUNT(*) FILTER (WHERE sexo = 'F') as mulheres,
      COUNT(*) FILTER (WHERE batizado = true) as batizados,
      COUNT(*) FILTER (WHERE avatar_url IS NOT NULL) as com_avatars
      FROM membros`;
    
    try {
      const result = await db.query(sql);
      return result[0];
    } catch (error) {
      console.error('Erro ao buscar estatisticas:', error);
      throw error;
    }
  }

  getNomeCompleto(memberData) {
    return memberData.nomeCompleto || 
           memberData.nome_completo || 
           `${memberData.nome || ''} ${memberData.sobrenome || ''}`.trim();
  }

  normalizeValue(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string') return value.trim();
    return value;
  }

  async clearAllMembers() {
    console.log('clearAllMembers() chamado - metodo obsoleto');
    console.log('Use importMembers() diretamente - ja e inteligente');
    return { message: 'Use importMembers() - e inteligente e preserva tudo' };
  }

  async cleanupUnusedAvatars() {
    console.log('Limpeza de avatars nao implementada nesta versao');
    return { removidos: 0, mantidos: 0 };
  }
}

module.exports = new MemberServicePostgreSQL();
