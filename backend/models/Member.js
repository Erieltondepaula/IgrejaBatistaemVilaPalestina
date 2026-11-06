// Local do arquivo: backend/models/Member.js
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  // Adaptação da sua interface Member para o Mongoose
  nome: { type: String, required: true },
  nomeCompleto: String,
  photoUrl: String,
  dataNascimento: { type: String, required: true },
  idade: Number,
  mes: String,
  sexo: String,
  telefone: String,
  email: String,
  endereco: String,
  rua: String,
  numero: String,
  bairro: String,
  cidade: String,
  estado: String,
  cep: String,
  status: { type: String, default: 'ativo' },
  statusCivil: String,
  conjuge: String,
  parentesco: String,
  batizado: Boolean,
  membro: Boolean,
  lider: Boolean,
  professorEBQ: Boolean,
  faixaEtaria: String,
  pequeno_grupo: Boolean,
  grupo: String,
  numero_domes: Number,
  observacoes: String,
}, { 
  timestamps: true // Adiciona os campos createdAt e updatedAt automaticamente
});

module.exports = mongoose.model('Member', memberSchema);