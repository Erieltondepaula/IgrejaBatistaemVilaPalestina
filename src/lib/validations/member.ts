// Local do arquivo: src/lib/validations/member.ts

import { z } from 'zod';

// Define as regras de validação para cada campo do formulário
export const memberSchema = z.object({
  nome: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  nomeCompleto: z.string().optional().or(z.literal('')).nullable(),
  avatar_url: z.string().url({ message: "URL da foto inválida." }).optional().or(z.literal('')).nullable(),
  dataNascimento: z.string().refine((date) => new Date(date).toString() !== 'Invalid Date' && date, {
    message: "Data de nascimento é obrigatória.",
  }),
  sexo: z.enum(['M', 'F'], { required_error: "Selecione o sexo." }),
  telefone: z.string().optional().or(z.literal('')).nullable(),
  email: z.string().email({ message: "Formato de e-mail inválido." }).optional().or(z.literal('')).nullable(),
  endereco: z.string().optional().or(z.literal('')).nullable(),
  rua: z.string().optional().or(z.literal('')).nullable(),
  numero: z.string().optional().or(z.literal('')).nullable(),
  bairro: z.string().optional().or(z.literal('')).nullable(),
  cidade: z.string().optional().or(z.literal('')).nullable(),
  estado: z.string().optional().or(z.literal('')).nullable(),
  cep: z.string().optional().or(z.literal('')).nullable(),
  status: z.enum(['ativo', 'desligado']),
  motivoDesligamento: z.string().optional().or(z.literal('')).nullable(),
  dataDesligamento: z.string().optional().or(z.literal('')).nullable(),
  dataBatismo: z.string().optional().or(z.literal('')).nullable(),
  statusCivil: z.string().optional().or(z.literal('')).nullable(),
  conjuge: z.string().optional().or(z.literal('')).nullable(),
  parentesco: z.string().optional().or(z.literal('')).nullable(),
  batizado: z.boolean().default(false),
  membro: z.boolean().default(false),
  lider: z.boolean().default(false),
  professorEBQ: z.boolean().default(false),
  pequeno_grupo: z.boolean().default(false),
  grupo: z.string().optional().or(z.literal('')).nullable(),
  observacoes: z.string().optional().or(z.literal('')).nullable(),
});