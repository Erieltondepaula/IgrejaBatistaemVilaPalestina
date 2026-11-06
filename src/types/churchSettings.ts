// Tipos para configurações da igreja
// Local: src/types/churchSettings.ts

export interface ChurchSettings {
  id: number;
  nome: string;
  denominacao: string;
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  pais: string;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChurchSettingsFormData {
  nome: string;
  denominacao: string;
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  pais: string;
  logo_url?: string;
}
