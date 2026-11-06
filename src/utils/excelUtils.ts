// Local do arquivo: src/utils/excelUtils.ts
// ✅ CÓDIGO CORRIGIDO PARA LER AS FUNÇÕES DA PLANILHA

import * as XLSX from 'xlsx';
import { Member } from '@/types/member';
import { calculateAge, getMemberType, getAgeGroup } from './memberUtils';
import { saveAs } from 'file-saver';

const normalizeHeader = (header: string): string => {
  if (!header) return '';
  return header.trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
};

// ✅ MAPEAMENTO COMPLETO: Todas as colunas do arquivo original
const REQUIRED_COLUMNS_MAP: Record<string, string[]> = {
  id: ['id'],
  idExterno: ['id_externo'],
  nome: ['nome'],
  sobrenome: ['sobrenome'],
  nomeCompleto: ['nome_completo'],
  dataNascimento: ['data_de_nascimento', 'data_nascimento'],
  idade: ['idade'],
  mes: ['mes'],
  sexo: ['sexo'],
  telefone: ['telefone'],
  observacoes: ['observacoes'],
  statusCivil: ['status_civil'],
  conjuge: ['nome_conjuge', 'conjuge'],
  parentesco: ['parentesco'],
  rua: ['rua'],
  numero: ['numero'],
  bairro: ['bairro'],
  cidade: ['cidade'],
  estado: ['estado'],
  cep: ['cep'],
  status: ['situacao_atual', 'status'],
  batizado: ['batizado', 'batizado_?'],
  membro: ['membro'],
  lider: ['e_lider', 'lider', 'e_lider_?'],
  professorEBQ: ['e_professor_ebq', 'professor_ebq', 'e_professor_ebq_?'],
  faixaEtaria: ['faixa_etaria'],
  pequenoGrupo: ['esta_em_um_pequeno_grupo_?', 'pequeno_grupo'],
  grupo: ['grupo'],
  numeroDomes: ['numerodomes', 'numero_domes']
};

const ESSENTIAL_KEYS: Array<keyof typeof REQUIRED_COLUMNS_MAP> = ['nome', 'dataNascimento', 'sexo'];

const isYes = (value: unknown): boolean => {
  const str = String(value || '').trim().toLowerCase();
  return ['sim', 's', 'true', '1', 'yes', 'y'].includes(str);
};

const isAtivo = (value: unknown): 'ativo' | 'desligado' => {
  const str = String(value || '').trim().toLowerCase();
  return ['ativo', 'active', 'sim', 's'].includes(str) ? 'ativo' : 'desligado';
};

const parseDate = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'number' && value > 1) {
    const date = XLSX.SSF.parse_date_code(value);
    if (date && date.y && date.m && date.d) {
        const jsDate = new Date(Date.UTC(date.y, date.m - 1, date.d));
        return jsDate.toISOString().split('T')[0];
    }
  }
  if (typeof value === 'string') {
    const dateStr = value.trim();
    const isoMatch = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (isoMatch) {
      const [_, year, month, day] = isoMatch;
      if (parseInt(year) > 1900 && parseInt(month) <= 12 && parseInt(day) <= 31) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    const ptMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ptMatch) {
      const [_, day, month, year] = ptMatch;
      if (parseInt(year) > 1900 && parseInt(month) <= 12 && parseInt(day) <= 31) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  return '';
};

export const importFromExcel = (file: File): Promise<Partial<Member>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { raw: true });
        
        if (jsonData.length === 0) return reject(new Error('A planilha está vazia.'));

        const headerMap: Map<string, string> = new Map();
        Object.keys(jsonData[0]).forEach(originalKey => headerMap.set(normalizeHeader(originalKey), originalKey));
        
        const missingColumns = ESSENTIAL_KEYS.filter(key => !REQUIRED_COLUMNS_MAP[key].some(alias => headerMap.has(alias)));
        if (missingColumns.length > 0) {
          const missingColumnNames = missingColumns.map(key => REQUIRED_COLUMNS_MAP[key][0].replace(/_/g, ' '));
          return reject(new Error(`Colunas obrigatórias não encontradas: ${missingColumnNames.join(', ')}.`));
        }

        const getRowValue = (row: Record<string, unknown>, key: keyof typeof REQUIRED_COLUMNS_MAP): unknown => {
          for (const alias of REQUIRED_COLUMNS_MAP[key]) {
            if (headerMap.has(alias)) return row[headerMap.get(alias)!];
          }
          return undefined;
        };

        const requiredFields = ['batizado', 'membro', 'situacao_atual'] as const;
        const invalidRows = jsonData.flatMap((row, index) => {
          const missingFields = requiredFields.filter((field) => {
            const value = getRowValue(row, field === 'situacao_atual' ? 'status' : field);
            return value === undefined || value === null || String(value).trim() === '';
          });
          if (missingFields.length === 0) return [];

          const name = String(getRowValue(row, 'nomeCompleto') || getRowValue(row, 'nome') || '').trim();
          const rowLabel = name ? ` (${name})` : '';
          return [`Linha ${index + 2}${rowLabel}: ${missingFields.join(', ')}`];
        });

        if (invalidRows.length > 0) {
          return reject(new Error(`Preencha os campos obrigatórios da planilha:\n${invalidRows.join('\n')}`));
        }

        const members: Partial<Member>[] = jsonData.map((row, index): Partial<Member> => {
            const getValue = (key: keyof typeof REQUIRED_COLUMNS_MAP): unknown => {
                return getRowValue(row, key);
            };

            const dataNascimento = parseDate(getValue('dataNascimento'));
            if (!dataNascimento) {
              throw new Error(`Linha ${index + 2}: Data de Nascimento inválida ou em branco. Use o formato DD/MM/YYYY ou YYYY-MM-DD.`);
            }
            
            const idade = calculateAge(dataNascimento);
            const sexoRaw = String(getValue('sexo') || '').toLowerCase();
            const sexo = sexoRaw.startsWith('masc') ? 'M' : 'F';

            // Extrai mês da data de nascimento
            const dateParts = dataNascimento.split('-');
            const monthNumber = parseInt(dateParts[1]);
            const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                          'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const mes = meses[monthNumber - 1] || '';

            return {
                id: String(getValue('id') || ''),
                idExterno: String(getValue('idExterno') || ''),
                nome: String(getValue('nome') || ''),
                sobrenome: String(getValue('sobrenome') || ''),
                nomeCompleto: String(getValue('nomeCompleto') || getValue('nome') || ''),
                dataNascimento,
                idade: idade,
                mes: mes,
                faixaEtaria: getAgeGroup(idade),
                sexo,
                telefone: String(getValue('telefone') || ''),
                observacoes: String(getValue('observacoes') || ''),
                statusCivil: String(getValue('statusCivil') || ''),
                conjuge: String(getValue('conjuge') || ''),
                parentesco: String(getValue('parentesco') || ''),
                rua: String(getValue('rua') || ''),
                numero: String(getValue('numero') || ''),
                bairro: String(getValue('bairro') || ''),
                cidade: String(getValue('cidade') || ''),
                estado: String(getValue('estado') || ''),
                cep: String(getValue('cep') || ''),
                status: isAtivo(getValue('status')),
                situacao_atual: String(getValue('status') || ''),
                batizado: isYes(getValue('batizado')),
                membro: isYes(getValue('membro')),
                lider: isYes(getValue('lider')),
                professorEBQ: isYes(getValue('professorEBQ')),
                pequeno_grupo: isYes(getValue('pequenoGrupo')),
                grupo: String(getValue('grupo') || ''),
                numero_domes: getValue('numeroDomes') ? parseInt(String(getValue('numeroDomes'))) : undefined,
            };
        });
        resolve(members);
      } catch (error) {
        reject(error as Error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

// ... o resto do arquivo (exportToExcel) permanece o mesmo
export const exportToExcel = (members: Member[], filename: string = 'membros-exportados') => {
  const dataToExport = members.map(member => ({
    'Id': member.id || '',
    'id_externo': member.idExterno || '',
    'nome': member.nome || '',
    'sobrenome': member.sobrenome || '',
    'Nome Completo': member.nomeCompleto || member.nome || '',
    'data_nascimento': member.dataNascimento ? new Date(member.dataNascimento + 'T00:00:00Z').toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '',
    'idade': calculateAge(member.dataNascimento),
    'mes': member.mes || '',
    'telefone': member.telefone || '',
    'sexo': member.sexo === 'M' ? 'Masculino' : 'Feminino',
    'observacoes': member.observacoes || '',
    'status_civil': member.statusCivil || '',
    'nome_conjuge ': member.conjuge || '',
    'parentesco ': member.parentesco || '',
    'rua': member.rua || '',
    'numero': member.numero || '',
    'bairro': member.bairro || '',
    'cidade': member.cidade || '',
    'estado': member.estado || '',
    'cep': member.cep || '',
    'batizado': member.batizado ? 'Sim' : 'Não',
    'membro': member.membro ? 'Sim' : 'Não',
    'situacao_atual': member.status === 'ativo' ? 'Ativo' : 'Desligado',
    'e_lider': member.lider ? 'Sim' : 'Não',
    'e_professor_ebq\n': member.professorEBQ ? 'Sim' : 'Não',
    'faixa_etaria ': member.faixaEtaria || '',
    'Está em um pequeno grupo ?': member.pequeno_grupo ? 'Sim' : 'Não',
    'grupo': member.grupo || '',
    'numerodomes': member.numero_domes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Membros');

  const colWidths = Object.keys(dataToExport[0] || {}).map(key => {
    type RowData = typeof dataToExport[0];
    const maxLength = Math.max(...dataToExport.map(row => String(row[key as keyof RowData] ?? '').length));
    return { wch: Math.max(key.length, maxLength) + 2 };
  });
  worksheet['!cols'] = colWidths;

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(data, `${filename}.xlsx`);
};