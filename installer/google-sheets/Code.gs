const MEMBER_FIELDS = {
  id_externo: { header: 'system_id', aliases: ['system_id', 'id_sistema', 'id_externo', 'id'] },
  nome: { header: 'nome', aliases: ['nome', 'first_name'] },
  sobrenome: { header: 'sobrenome', aliases: ['sobrenome', 'last_name'] },
  nome_completo: { header: 'nome_completo', aliases: ['nome_completo', 'nome completo', 'full_name', 'full name'] },
  data_nascimento: { header: 'data_nascimento', aliases: ['data_nascimento', 'data de nascimento', 'data nascimento', 'data_nasc'] },
  telefone: { header: 'telefone', aliases: ['telefone', 'celular', 'phone'] },
  sexo: { header: 'sexo', aliases: ['sexo', 'genero', 'gênero'] },
  observacoes: { header: 'observacoes', aliases: ['observacoes', 'observações', 'obs'] },
  status_civil: { header: 'status_civil', aliases: ['status_civil', 'estado civil', 'status civil'] },
  conjuge: { header: 'conjuge', aliases: ['conjuge', 'cônjuge', 'nome_conjuge'] },
  parentesco: { header: 'parentesco', aliases: ['parentesco'] },
  rua: { header: 'rua', aliases: ['rua', 'endereco', 'endereço'] },
  numero: { header: 'numero', aliases: ['numero', 'número', 'numero_casa'] },
  bairro: { header: 'bairro', aliases: ['bairro'] },
  cidade: { header: 'cidade', aliases: ['cidade'] },
  estado: { header: 'estado', aliases: ['estado', 'uf'] },
  cep: { header: 'cep', aliases: ['cep'] },
  batizado: { header: 'batizado', aliases: ['batizado', 'batizado?'] },
  membro: { header: 'membro', aliases: ['membro', 'e_membro'] },
  situacao_atual: { header: 'situacao_atual', aliases: ['situacao_atual', 'situação atual', 'status'] },
  lider: { header: 'lider', aliases: ['lider', 'líder', 'e_lider'] },
  e_professor_ebq: { header: 'professor_ebq', aliases: ['professor_ebq', 'professor ebq', 'e_professor_ebq'] },
  pequeno_grupo: { header: 'pequeno_grupo', aliases: ['pequeno_grupo', 'pequeno grupo'] },
  grupo: { header: 'grupo', aliases: ['grupo', 'nome do grupo'] }
};

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

function findColumnIndexes(sheet) {
  let columnCount = sheet.getLastColumn();
  if (columnCount === 0) {
    const headers = Object.values(MEMBER_FIELDS).map((field) => field.header);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    columnCount = headers.length;
  }

  let headers = sheet.getRange(1, 1, 1, columnCount).getValues()[0];
  const indexes = {};
  Object.keys(MEMBER_FIELDS).forEach((key) => {
    const aliases = MEMBER_FIELDS[key].aliases.map(normalizeHeader);
    let index = headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
    if (index < 0) {
      columnCount += 1;
      headers.push(MEMBER_FIELDS[key].header);
      sheet.getRange(1, columnCount).setValue(MEMBER_FIELDS[key].header);
      index = columnCount - 1;
    }
    indexes[key] = index + 1;
  });

  return { indexes, columnCount };
}

function normalizeDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  const text = String(value || '').trim();
  const brazilian = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (brazilian) {
    return `${brazilian[3]}-${brazilian[2].padStart(2, '0')}-${brazilian[1].padStart(2, '0')}`;
  }
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : text;
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  return ['true', 'sim', 'yes', '1', 'x'].includes(String(value || '').trim().toLowerCase());
}

function memberFromRow(row, indexes) {
  const values = {};
  Object.keys(indexes).forEach((key) => {
    values[key] = row[indexes[key] - 1];
  });

  const fullName = String(values.nome_completo || '').trim()
    || [values.nome, values.sobrenome].map((part) => String(part || '').trim()).filter(Boolean).join(' ');
  const nameParts = fullName.split(/\s+/);

  return {
    id_externo: String(values.id_externo || '').trim(),
    nome: String(values.nome || nameParts[0] || '').trim(),
    sobrenome: String(values.sobrenome || nameParts.slice(1).join(' ')).trim(),
    nome_completo: fullName,
    data_nascimento: normalizeDate(values.data_nascimento),
    telefone: String(values.telefone || '').trim(),
    sexo: String(values.sexo || '').trim().toUpperCase(),
    observacoes: String(values.observacoes || '').trim(),
    status_civil: String(values.status_civil || '').trim(),
    conjuge: String(values.conjuge || '').trim(),
    parentesco: String(values.parentesco || '').trim(),
    rua: String(values.rua || '').trim(),
    numero: String(values.numero || '').trim(),
    bairro: String(values.bairro || '').trim(),
    cidade: String(values.cidade || '').trim(),
    estado: String(values.estado || '').trim(),
    cep: String(values.cep || '').trim(),
    batizado: normalizeBoolean(values.batizado),
    membro: normalizeBoolean(values.membro),
    situacao_atual: String(values.situacao_atual || '').trim(),
    lider: normalizeBoolean(values.lider),
    e_professor_ebq: normalizeBoolean(values.e_professor_ebq),
    pequeno_grupo: normalizeBoolean(values.pequeno_grupo),
    grupo: String(values.grupo || '').trim()
  };
}

function normalizeIncomingMember(member) {
  const fullName = String(member.nome_completo || '').trim()
    || [member.nome, member.sobrenome].map((part) => String(part || '').trim()).filter(Boolean).join(' ');
  const nameParts = fullName.split(/\s+/);
  return {
    id_externo: String(member.id_externo || member.system_id || '').trim() || Utilities.getUuid(),
    nome: String(member.nome || nameParts[0] || '').trim(),
    sobrenome: String(member.sobrenome || nameParts.slice(1).join(' ')).trim(),
    nome_completo: fullName,
    data_nascimento: normalizeDate(member.data_nascimento),
    telefone: String(member.telefone || '').trim(),
    sexo: String(member.sexo || '').trim().toUpperCase(),
    observacoes: String(member.observacoes || '').trim(),
    status_civil: String(member.status_civil || '').trim(),
    conjuge: String(member.conjuge || '').trim(),
    parentesco: String(member.parentesco || '').trim(),
    rua: String(member.rua || '').trim(),
    numero: String(member.numero || '').trim(),
    bairro: String(member.bairro || '').trim(),
    cidade: String(member.cidade || '').trim(),
    estado: String(member.estado || '').trim(),
    cep: String(member.cep || '').trim(),
    batizado: normalizeBoolean(member.batizado),
    membro: normalizeBoolean(member.membro),
    situacao_atual: String(member.situacao_atual || '').trim(),
    lider: normalizeBoolean(member.lider),
    e_professor_ebq: normalizeBoolean(member.e_professor_ebq),
    pequeno_grupo: normalizeBoolean(member.pequeno_grupo),
    grupo: String(member.grupo || '').trim()
  };
}

function findExistingRow(sheet, indexes, member) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const targetName = member.nome_completo.toLowerCase();
  const targetBirth = member.data_nascimento;

  for (let index = 0; index < rows.length; index += 1) {
    const existing = memberFromRow(rows[index], indexes);
    if (member.id_externo && existing.id_externo === member.id_externo) return index + 2;
    if (
      existing.nome_completo.toLowerCase() === targetName
      && existing.data_nascimento === targetBirth
    ) {
      return index + 2;
    }
  }
  return null;
}

function writeMemberRow(sheet, rowIndex, columnCount, indexes, member) {
  const row = Array(columnCount).fill('');
  Object.keys(indexes).forEach((key) => {
    row[indexes[key] - 1] = member[key] === undefined || member[key] === null ? '' : member[key];
  });
  sheet.getRange(rowIndex, 1, 1, columnCount).setValues([row]);
}

function doPost(event) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const request = JSON.parse(event.postData.contents);
    const expectedToken = properties.getProperty('SYNC_TOKEN');
    if (!expectedToken || request.token !== expectedToken) {
      return jsonResponse({ success: false, error: 'Não autorizado.' });
    }
    if (request.action !== 'create-if-missing' || !request.member) {
      return jsonResponse({ success: false, error: 'Ação ou cadastro inválido.' });
    }

    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) throw new Error('SPREADSHEET_ID não configurado nas propriedades do script.');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const configuredSheetName = properties.getProperty('SHEET_NAME');
    const sheet = configuredSheetName
      ? spreadsheet.getSheetByName(configuredSheetName)
      : spreadsheet.getSheets()[0];
    if (!sheet) throw new Error('A aba configurada não foi encontrada.');

    const member = normalizeIncomingMember(request.member);
    if (
      !member.nome_completo
      || !member.data_nascimento
      || !member.sexo
      || !member.situacao_atual
    ) {
      return jsonResponse({ success: false, error: 'Nome, nascimento, sexo e situação são obrigatórios.' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const { indexes, columnCount } = findColumnIndexes(sheet);
      const existingRowIndex = findExistingRow(sheet, indexes, member);
      if (existingRowIndex) {
        const existingRow = sheet.getRange(existingRowIndex, 1, 1, columnCount).getValues()[0];
        const existingMember = memberFromRow(existingRow, indexes);
        if (!existingMember.id_externo) {
          existingMember.id_externo = member.id_externo;
          sheet.getRange(existingRowIndex, indexes.id_externo).setValue(member.id_externo);
        }
        return jsonResponse({ success: true, created: false, member: existingMember });
      }

      writeMemberRow(sheet, sheet.getLastRow() + 1, columnCount, indexes, member);
      return jsonResponse({ success: true, created: true, member: member });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.message || 'Falha ao gravar na planilha.' });
  }
}
