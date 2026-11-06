// Local do arquivo: src/utils/memberUtils.ts
// ✅ CORREÇÃO: Adicionada a lógica de filtro para Líderes e Professores.

import { Member, MemberFilters, ChartData, AgeGroupData, NeighborhoodData } from '@/types/member';
import { AGE_RANGE_COLORS } from '@/constants/chartColors';

// --- FUNÇÕES DE DATA COM FUSO HORÁRIO DE BRASÍLIA (UTC-3) ---

const TIME_ZONE = 'America/Sao_Paulo';

/**
 * Pega a data e hora atuais, formatadas especificamente para o fuso horário de Brasília.
 * Retorna um objeto com as partes da data para comparações seguras.
 */
const getTodayInBrasilia = () => {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(today);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10); // Mês é 1-12
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);

  return { year, month, day };
};

/**
 * Analisa uma string de data 'YYYY-MM-DD' ou ISO (com hora) e retorna suas partes numéricas.
 */
const parseDateString = (dateString: string): { year: number; month: number; day: number } | null => {
  if (!dateString) return null;
  
  // Se a data está em formato ISO (com T e hora)
  if (dateString.includes('T')) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1, // getMonth() retorna 0-11, precisamos 1-12
      day: date.getDate()
    };
  }
  
  // Formato padrão YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }
  const [year, month, day] = dateString.split('-').map(Number);
  return { year, month, day }; // Mês é 1-12
};

export const calculateAge = (birthDate: string): number => {
  const birth = parseDateString(birthDate);
  if (!birth) return 0;

  const today = getTodayInBrasilia();
  let age = today.year - birth.year;
  
  // Se ainda não chegou o aniversário este ano, subtrai 1
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) {
    age--;
  }
  return age < 0 ? 0 : age;
};

// ✅ LÓGICA DE ANIVERSARIANTES CORRIGIDA E SIMPLIFICADA
export const isBirthdayInMonth = (birthDate: string): boolean => {
  const birth = parseDateString(birthDate);
  if (!birth) return false;
  
  const today = getTodayInBrasilia();
  return birth.month === today.month;
};

export const isBirthdayToday = (birthDate: string): boolean => {
  const birth = parseDateString(birthDate);
  if (!birth) return false;

  const today = getTodayInBrasilia();
  return birth.day === today.day && birth.month === today.month;
};

export const isBirthdayInPeriod = (birthDate: string, startDate?: string, endDate?: string): boolean => {
    if (!birthDate || !startDate || !endDate) return false;

    const birth = parseDateString(birthDate);
    const start = parseDateString(startDate);
    const end = parseDateString(endDate);

    if (!birth || !start || !end) return false;
    
    // ✅ CORREÇÃO: Usar o ano do período selecionado para todas as comparações
    // Isso garante que estamos comparando mês/dia independente do ano de nascimento
    const periodYear = start.year;

    // Cria datas de aniversário usando o ano do período selecionado
    const birthInPeriodYear = new Date(Date.UTC(periodYear, birth.month - 1, birth.day));
    const birthInNextYear = new Date(Date.UTC(periodYear + 1, birth.month - 1, birth.day));
    
    const startUTC = new Date(Date.UTC(start.year, start.month - 1, start.day));
    const endUTC = new Date(Date.UTC(end.year, end.month - 1, end.day));

    // Se o período cruza o ano (ex: Dezembro a Janeiro)
    if (startUTC > endUTC) {
      return birthInPeriodYear >= startUTC || birthInNextYear <= endUTC;
    }

    return birthInPeriodYear >= startUTC && birthInPeriodYear <= endUTC;
};

// ✅ CORREÇÃO APLICADA: Faixas etárias numéricas consistentes com as cores e ícones
export const getAgeGroup = (age: number): string => {
  if (age <= 2) return '0-2'; // Bebês
  if (age <= 5) return '3-5'; // Primeira infância
  if (age <= 11) return '6-11'; // Infância
  if (age <= 17) return '12-17'; // Adolescência
  if (age <= 29) return '18-29'; // Jovem adulto
  if (age <= 44) return '30-44'; // Adulto
  if (age <= 59) return '45-59'; // Adulto de meia-idade
  return '60+'; // Idoso
};

export const getMemberType = (member: Member): 'Membro' | 'Batizado Congregado' | 'Congregado' | 'Desligado' => {
    if (member.status === 'desligado') return 'Desligado';
    if (member.membro) return 'Membro';
    if (member.batizado) return 'Batizado Congregado';
    return 'Congregado';
};

// --- FUNÇÃO DE FILTRO COMPLETA ---
export const filterMembers = (members: Member[], filters: MemberFilters): Member[] => {
  return members.filter(member => {
    if (!member.dataNascimento) return false; // Garante que membros sem data não quebrem o filtro
    
    const age = calculateAge(member.dataNascimento);

    // ✅ REGRA PRINCIPAL: Por padrão, mostra apenas membros ATIVOS
    // Só mostra desligados se explicitamente filtrado por statusGeral='desligado'
    if (filters.statusGeral) {
      // Se o usuário selecionou um status específico, aplica o filtro
      if (member.status !== filters.statusGeral) return false;
    } else {
      // Se não há filtro de status, mostra apenas ATIVOS por padrão
      if (member.status !== 'ativo') return false;
    }

    // ✅ Busca por um ou vários nomes (separados por vírgula, ponto e vírgula, quebra de linha ou pipe)
    const collectSearchTerms = (value: unknown): string[] => {
      if (value == null) return [];
      if (Array.isArray(value)) return value.flatMap(v => String(v).split(/[;,\n|]/));
      return String(value).split(/[;,\n|]/);
    };

    const normalizeText = (value: string) =>
      value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const searchTerms = [
      ...collectSearchTerms(filters.search),
      ...collectSearchTerms(filters.searchNames),
      ...collectSearchTerms(filters.nomes),
      ...collectSearchTerms(filters.name),
      ...collectSearchTerms(filters.nome),
    ]
      .map(normalizeText)
      .filter(Boolean);

    if (searchTerms.length > 0) {
      const memberNames = [member.nome, member.nomeCompleto, member.sobrenome]
        .filter(Boolean)
        .map(value => normalizeText(String(value)));
      const matchesAnyTerm = searchTerms.some(term =>
        memberNames.some(name => name.includes(term))
      );
      if (!matchesAnyTerm) return false;
    }
    
    // ✅ ALTERADO: Lógica para filtrar por intervalo de idade
    if (filters.idadeRange) {
      const minAge = filters.idadeRange.min ? parseInt(filters.idadeRange.min, 10) : null;
      const maxAge = filters.idadeRange.max ? parseInt(filters.idadeRange.max, 10) : null;
      if (minAge !== null && age < minAge) return false;
      if (maxAge !== null && age > maxAge) return false;
    }

    if (filters.faixaEtaria && getAgeGroup(age) !== filters.faixaEtaria) return false;
    if (filters.sexo) {
      const sexoFiltro = filters.sexo.toLowerCase();
      const sexoMembro = member.sexo?.toLowerCase();
      const matchMasc = sexoFiltro === 'm' || sexoFiltro === 'masculino';
      const matchFem = sexoFiltro === 'f' || sexoFiltro === 'feminino';
      if (!( (matchMasc && (sexoMembro === 'm' || sexoMembro === 'masculino')) ||
             (matchFem && (sexoMembro === 'f' || sexoMembro === 'feminino')) )) {
        return false;
      }
    }
    if (filters.bairro && member.bairro !== filters.bairro) return false;
    if (filters.aniversariantesDoMes && !isBirthdayInMonth(member.dataNascimento)) return false;
    if (filters.aniversariantesDoDia && !isBirthdayToday(member.dataNascimento)) return false;
    if (filters.aniversariantesPeriodo?.dataInicial && filters.aniversariantesPeriodo?.dataFinal) {
      if (!isBirthdayInPeriod(member.dataNascimento, filters.aniversariantesPeriodo.dataInicial, filters.aniversariantesPeriodo.dataFinal)) {
        return false;
      }
    }
    if (filters.tipoMembro && filters.tipoMembro.length > 0) {
      // Só aplica o filtro de tipo se NÃO estiver filtrando explicitamente por desligados
      if (!(filters.statusGeral === 'desligado')) {
        if (member.status === 'desligado') return false;
        const tipoMembro = getMemberType(member);
        const typeMatch = filters.tipoMembro.some(tipo => {
          if (tipo === 'membro' && tipoMembro === 'Membro') return true;
          if (tipo === 'congregado' && tipoMembro === 'Congregado') return true;
          if (tipo === 'batizado_congregado' && tipoMembro === 'Batizado Congregado') return true;
          return false;
        });
        if (!typeMatch) return false;
      }
    }

    // ✅ ADICIONADO: Lógica de filtro para Líderes e Professores
    if (filters.lider && !member.lider) return false;
    if (filters.professorEBQ && !member.professorEBQ) return false;

    return true;
  });
};


// --- FUNÇÕES PARA GRÁFICOS E UI (sem alterações) ---
export const getStatusColor = (status?: 'ativo' | 'desligado'): string => status === 'ativo' ? '#22C55E' : '#9CA3AF';
export const getGenderChartData = (members: Member[]): ChartData[] => {
  const genderCount = members.reduce((acc, member) => {
    // ✅ CORRIGIDO: Aceita tanto M/F quanto Masculino/Feminino
    const sexo = member.sexo?.toLowerCase();
    if (sexo === 'm' || sexo === 'masculino') acc.Masculino = (acc.Masculino || 0) + 1;
    else if (sexo === 'f' || sexo === 'feminino') acc.Feminino = (acc.Feminino || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.keys(genderCount).map(key => ({ name: key, value: genderCount[key] }));
};

// ✅ CORREÇÃO APLICADA: Usando faixas etárias numéricas consistentes
export const getAgeGroupChartData = (members: Member[]): AgeGroupData[] => {
  const ageGroups: Record<string, number> = {
    '0-2': 0,
    '3-5': 0,
    '6-11': 0,
    '12-17': 0,
    '18-29': 0,
    '30-44': 0,
    '45-59': 0,
    '60+': 0
  };
  members.forEach(member => {
    const group = getAgeGroup(calculateAge(member.dataNascimento));
    if (ageGroups[group] !== undefined) ageGroups[group]++;
  });
  return Object.keys(ageGroups).map(key => ({ faixaEtaria: key, quantidade: ageGroups[key], fill: AGE_RANGE_COLORS[key] }));
};

export const normalizeNeighborhoodName = (name: string): string => name
  .trim()
  .replace(/\s+/g, ' ')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR');

export const getNeighborhoodData = (members: Member[]): NeighborhoodData[] => {
  const neighborhoods = new Map<string, { quantidade: number; nomes: Map<string, number> }>();

  members.forEach(member => {
    const bairro = member.bairro?.trim().replace(/\s+/g, ' ') || 'Não informado';
    const key = normalizeNeighborhoodName(bairro);
    const group = neighborhoods.get(key) || { quantidade: 0, nomes: new Map<string, number>() };
    group.quantidade += 1;
    group.nomes.set(bairro, (group.nomes.get(bairro) || 0) + 1);
    neighborhoods.set(key, group);
  });

  return Array.from(neighborhoods.values())
    .map(group => ({
      bairro: Array.from(group.nomes.entries()).sort((a, b) => b[1] - a[1])[0][0],
      quantidade: group.quantidade
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
};