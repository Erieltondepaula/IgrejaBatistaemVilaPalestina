export interface Member {
  id: string;
  idExterno?: string; // ID do sistema antigo
  nome: string;
  sobrenome?: string; // Sobrenome separado
  nomeCompleto?: string;
  avatar_url?: string; // Caminho da foto/avatar do membro
  dataNascimento: string;
  idade: number;
  mes: string;
  sexo: 'M' | 'F';
  telefone: string;
  email?: string;
  endereco: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  status: 'ativo' | 'desligado';
  situacao_atual?: string; // Campo adicional para compatibilidade com backend
  statusCivil?: string;
  conjuge?: string;
  parentesco?: string;
  batizado: boolean;
  membro: boolean;
  lider: boolean;
  professorEBQ: boolean;
  faixaEtaria: string;
  pequeno_grupo: boolean;
  grupo?: string;
  numero_domes?: number;
  dataBatismo?: string;
  dataMembresia?: string;
  dataDesligamento?: string;
  motivoDesligamento?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export type MemberFromDB = Omit<Member, 'id'> & { _id: string };
export interface MemberFilters {
  statusGeral?: 'ativo' | 'desligado';
  tipoMembro?: string[];
  sexo?: string;
  bairro?: string;
  faixaEtaria?: string;
  anoNascimento?: string;
  idadeRange?: { min?: string; max?: string; };
  aniversariantesDoMes?: boolean;
  aniversariantesDoDia?: boolean;
  lider?: boolean;
  professorEBQ?: boolean;
  aniversariantesPeriodo?: { dataInicial?: string; dataFinal?: string; };
  // Permite buscar por um ou vários nomes (string separada por vírgula ou lista)
  search?: string | string[];
  searchNames?: string[];
  nomes?: string | string[];
  name?: string | string[];
  nome?: string | string[];
}

export interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

export interface AgeGroupData {
  faixaEtaria: string;
  quantidade: number;
  fill?: string; // A cor é opcional, pois é adicionada depois
}

export interface NeighborhoodData {
  bairro: string;
  quantidade: number;
}

// ✅ ATUALIZADO: Adicionamos 'color' e 'task'
export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // Formato YYYY-MM-DD
  type: 'birthday' | 'event' | 'task';
  description?: string;
  color?: string;
}