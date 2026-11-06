import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle,
  Upload,
  FileText,
  Users,
  RefreshCw,
  X,
  Eye
} from 'lucide-react';
import { importFromExcel } from '@/utils/excelUtils';
import { Member } from '@/types/member';
import { apiUrl } from '@/lib/api';

interface DadosItem {
  linha: number;
  acao: string;
  nome: string;
  nomeCompleto?: string;
  idExterno?: string;
  telefone?: string;
  dataNascimento?: string;
  status?: string; // NOVO, EXISTE, etc
  membroCompleto?: Partial<Member>; // Objeto Member completo do Excel
  requerConfirmacao: boolean;
  diferencas?: {
    label: string;
    valorAtual: string;
    valorNovo: string;
  }[];
}

interface ResultadoItem {
  linha: number;
  acao: string;
  resultado: {
    sucesso: boolean;
    acao: string;
    mensagem?: string;
  };
  item: DadosItem;
}

interface EstatisticasAnalise {
  totalLinhas: number;
  novos: number;
  novosUsuarios?: number;
  duplicados: number;
  atualizacoes: number;
  semAlteracao?: number;
}

interface EstatisticasFinais {
  total: number;
  criados: number;
  atualizados?: number;
  pulados?: number;
  ignorados?: number;
  erros: number;
  totalFinal?: number;
}

const ImportacaoInterativa = () => {
  const [etapa, setEtapa] = useState('upload'); // upload, analise, processamento, concluido
  const [dadosAnalise, setDadosAnalise] = useState<{sucesso: boolean; estatisticas: EstatisticasAnalise; dados: DadosItem[]} | null>(null);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultados, setResultados] = useState<ResultadoItem[]>([]);
  const [modalConfirmacao, setModalConfirmacao] = useState<{item: DadosItem; acao: string; onConfirm: () => void; onCancel: () => void} | null>(null);
  const [estatisticasFinais, setEstatisticasFinais] = useState<EstatisticasFinais | null>(null);
  const [importandoCompleto, setImportandoCompleto] = useState(false);
  const [arquivoAtual, setArquivoAtual] = useState<File | null>(null);
  // Novo: IDs das linhas marcadas para atualização
  const [linhasParaAtualizar, setLinhasParaAtualizar] = useState<number[]>([]);
  // Checkbox de seleção em lote
  const [selecionarTodos, setSelecionarTodos] = useState(false);

  // NOVA FUNÇÃO: Importação Completa (Substitui Tudo)
  const importarCompleto = async (arquivo: File) => {
    if (!confirm('⚠️ ATENÇÃO!\n\nEsta ação irá LIMPAR TODO O BANCO DE DADOS e importar apenas os dados do Excel.\n\nTodos os registros atuais serão DELETADOS!\n\nDeseja continuar?')) {
      return;
    }

    setImportandoCompleto(true);
    setProcessando(true);
    setEtapa('processamento');

    try {
      // Importa do Excel usando excelUtils (frontend)
      const membrosImportados = await importFromExcel(arquivo);
      
      if (membrosImportados.length === 0) {
        throw new Error('Nenhum membro encontrado no arquivo');
      }

      // Envia para o backend substituir tudo
      const response = await fetch(apiUrl('/api/members/batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          members: membrosImportados,
          replaceAll: true
        }),
      });

      const resultado = await response.json();

      if (resultado.success) {
        setEstatisticasFinais({
          total: membrosImportados.length,
          criados: resultado.created || membrosImportados.length,
          pulados: 0,
          erros: resultado.errors?.length || 0,
          totalFinal: resultado.total || membrosImportados.length
        });
        setEtapa('concluido');
        alert(`✅ Importação concluída!\n\n` +
              `📊 Total de linhas: ${membrosImportados.length}\n` +
              `✅ Criados: ${resultado.created || membrosImportados.length}\n` +
              `❌ Erros: ${resultado.errors?.length || 0}\n` +
              `📈 Total no banco: ${resultado.total || membrosImportados.length}`);
      } else {
        alert('❌ Erro na importação: ' + resultado.message);
        setEtapa('upload');
      }
    } catch (error) {
      alert('❌ Erro ao importar: ' + (error as Error).message);
      setEtapa('upload');
    } finally {
      setProcessando(false);
      setImportandoCompleto(false);
    }
  };

  // Configuração do dropzone
  const onDrop = useCallback(async (arquivos: File[]) => {
    const arquivo = arquivos[0];
    if (!arquivo) return;

    // Armazenar arquivo para uso posterior
    setArquivoAtual(arquivo);

    setProcessando(true);
    setEtapa('analise');

    try {
      // Processa arquivo localmente (frontend) usando excelUtils
      const membrosImportados = await importFromExcel(arquivo);
      
      if (membrosImportados.length === 0) {
        throw new Error('Nenhum membro encontrado no arquivo');
      }

      // 🔍 BUSCAR MEMBROS EXISTENTES PARA COMPARAÇÃO
      let membrosExistentes: Member[] = [];
      try {
        const response = await fetch(apiUrl('/api/members'));
        if (response.ok) {
          membrosExistentes = await response.json();
        }
      } catch (error) {
        console.log('Não foi possível buscar membros existentes:', error);
      }

      // 📊 ANALISAR E COMPARAR DADOS
      const dados: DadosItem[] = [];
      let novos = 0;
      let atualizacoes = 0;
      let semAlteracao = 0;

      membrosImportados.forEach((membro, index) => {
        const nomeCompleto = (membro.nomeCompleto || membro.nome || '').trim().toUpperCase();
        const dataNasc = membro.dataNascimento;
        
        // 🔍 Procurar membro existente por nome + data nascimento
        const membroExistente = membrosExistentes.find(m => {
          const nomeMatch = m.nomeCompleto.trim().toUpperCase() === nomeCompleto;
          
          // Comparar datas (pode vir em formatos diferentes)
          let dataMatch = false;
          if (dataNasc && m.dataNascimento) {
            // Normalizar datas para comparação (apenas ano-mês-dia)
            const dataNascNorm = dataNasc.split('T')[0]; // Remove hora se tiver
            const dataExistenteNorm = m.dataNascimento.split('T')[0];
            dataMatch = dataNascNorm === dataExistenteNorm;
          }
          
          return nomeMatch && dataMatch;
        });

        console.log(`📋 Linha ${index + 2}: ${nomeCompleto} - ${membroExistente ? 'EXISTE' : 'NOVO'}`);

        if (!membroExistente) {
          // NOVO MEMBRO
          novos++;
          dados.push({
            linha: index + 2,
            acao: 'criar_novo',
            nome: membro.nome || '',
            nomeCompleto: membro.nomeCompleto,
            idExterno: membro.idExterno,
            telefone: membro.telefone,
            dataNascimento: membro.dataNascimento,
            status: 'NOVO',
            membroCompleto: membro,
            requerConfirmacao: false
          });
        } else {
          // VERIFICAR SE HÁ DIFERENÇAS
          const diferencas: { label: string; valorAtual: string; valorNovo: string }[] = [];
          
          // Comparar campos principais
          const camposParaComparar: Array<{ key: keyof Member; label: string }> = [
            { key: 'telefone', label: 'Telefone' },
            { key: 'rua', label: 'Rua' },
            { key: 'numero', label: 'Número' },
            { key: 'bairro', label: 'Bairro' },
            { key: 'cidade', label: 'Cidade' },
            { key: 'estado', label: 'Estado' },
            { key: 'cep', label: 'CEP' },
            { key: 'statusCivil', label: 'Estado Civil' },
            { key: 'status', label: 'Situação' }
          ];

          camposParaComparar.forEach(({ key, label }) => {
            const valorAtual = String(membroExistente[key] || '').trim();
            const valorNovo = String(membro[key as keyof typeof membro] || '').trim();
            
            if (valorAtual !== valorNovo && valorNovo !== '') {
              diferencas.push({
                label,
                valorAtual: valorAtual || '(vazio)',
                valorNovo
              });
            }
          });

          if (diferencas.length > 0) {
            // TEM ATUALIZAÇÕES
            atualizacoes++;
            dados.push({
              linha: index + 2,
              acao: 'confirmar_atualizacao',
              nome: membro.nome || '',
              nomeCompleto: membro.nomeCompleto,
              idExterno: membro.idExterno,
              telefone: membro.telefone,
              dataNascimento: membro.dataNascimento,
              status: 'EXISTE',
              requerConfirmacao: true,
              diferencas
            });
          } else {
            // SEM ALTERAÇÃO
            semAlteracao++;
            dados.push({
              linha: index + 2,
              acao: 'sem_alteracao',
              nome: membro.nome || '',
              nomeCompleto: membro.nomeCompleto,
              idExterno: membro.idExterno,
              telefone: membro.telefone,
              dataNascimento: membro.dataNascimento,
              status: 'EXISTE',
              requerConfirmacao: false
            });
          }
        }
      });

      const dadosAnaliseDetalhados = {
        sucesso: true,
        estatisticas: {
          totalLinhas: membrosImportados.length,
          novos,
          duplicados: 0,
          atualizacoes,
          semAlteracao
        },
        dados
      };

      setDadosAnalise(dadosAnaliseDetalhados);
      setEtapa('processamento');
    } catch (error) {
      alert('Erro ao processar arquivo: ' + (error as Error).message);
      setEtapa('upload');
    } finally {
      setProcessando(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  // Confirmar ação para um item específico
  const confirmarAcao = async (item: DadosItem, acao: string) => {
    if (item.requerConfirmacao && acao === 'atualizar') {
      setModalConfirmacao({
        item,
        acao,
        onConfirm: () => executarAcao(item, acao),
        onCancel: () => setModalConfirmacao(null)
      });
      setLinhasParaAtualizar((prev) => prev.includes(item.linha) ? prev : [...prev, item.linha]);
    } else {
      await executarAcao(item, acao);
      if (acao === 'atualizar') {
        setLinhasParaAtualizar((prev) => prev.includes(item.linha) ? prev : [...prev, item.linha]);
      }
      if (acao === 'ignorar') {
        setLinhasParaAtualizar((prev) => prev.filter(l => l !== item.linha));
      }
    }
  };

  // Seleção em lote: marcar/desmarcar todos
  const handleSelecionarTodos = () => {
    if (!dadosAnalise) return;
    if (!selecionarTodos) {
      // Seleciona todas as linhas de atualização
      const todas = dadosAnalise.dados.filter(item => item.acao === 'confirmar_atualizacao').map(item => item.linha);
      setLinhasParaAtualizar(todas);
      setSelecionarTodos(true);
    } else {
      setLinhasParaAtualizar([]);
      setSelecionarTodos(false);
    }
  };

  // Seleção individual por checkbox
  const handleSelecionarLinha = (linha: number) => {
    setLinhasParaAtualizar((prev) => prev.includes(linha) ? prev.filter(l => l !== linha) : [...prev, linha]);
  };

  // Executar ação individual
  const executarAcao = async (item: DadosItem, acao: string) => {
    try {
      // Simula resultado da ação
      const resultado = {
        sucesso: true,
        acao: acao === 'criar_novo' ? 'criado' : 'ignorado',
        mensagem: `${acao === 'criar_novo' ? 'Membro criado' : 'Ação ignorada'}`
      };

      // Atualizar resultado local
      setResultados((prev: ResultadoItem[]) => [
        ...prev,
        {
          linha: item.linha,
          acao: acao,
          resultado: resultado,
          item: item
        }
      ]);

      // Fechar modal se estiver aberto
      setModalConfirmacao(null);

      // Atualizar progresso
      if (!dadosAnalise) return;
      const novoProgresso = ((resultados.length + 1) / dadosAnalise.dados.length) * 100;
      setProgresso(novoProgresso);

      // Se terminou, mostrar estatísticas
      if (resultados.length + 1 === dadosAnalise.dados.length) {
        calcularEstatisticasFinais();
        setEtapa('concluido');
      }

    } catch (error) {
      alert('Erro ao executar ação: ' + (error as Error).message);
    }
  };

  // Processar todos automaticamente (enviar para o banco)
  const processarTodosAutomaticos = async () => {
    if (!dadosAnalise || !dadosAnalise.dados) return;
    if (!arquivoAtual) {
      alert('❌ Arquivo não encontrado. Por favor, faça upload novamente.');
      return;
    }

    // 🎯 LÓGICA CORRIGIDA: Processar automaticamente APENAS os NOVOS cadastros
    // Não exige que o usuário marque nada para atualização
    const novos = dadosAnalise.dados.filter((item: DadosItem) => item.acao === 'criar_novo');
    
    if (novos.length === 0) {
      alert('Nenhum novo cadastro para processar. Se deseja atualizar registros existentes, use o botão "Atualizar Todos".');
      return;
    }

    try {
      setProcessando(true);
      setProgresso(0);

      // Monta o payload com os NOVOS membros (objetos Member completos)
      const membrosNovos = novos.map(item => item.membroCompleto).filter(Boolean);

      // Envia para o backend
      const response = await fetch(apiUrl('/api/members/batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          members: membrosNovos,
          replaceAll: false
        }),
      });

      const resultado = await response.json();

      if (resultado.success) {
        setEstatisticasFinais({
          total: membrosNovos.length,
          criados: resultado.inserted || membrosNovos.length,
          atualizados: 0,
          erros: resultado.errors?.length || 0,
          ignorados: resultado.ignored || 0
        });
        setProgresso(100);
        setEtapa('concluido');
        alert(`✅ Novos cadastros processados com sucesso!\n\n` +
              `📊 Total: ${membrosNovos.length}\n` +
              `✅ Criados: ${resultado.inserted || membrosNovos.length}\n` +
              `❌ Erros: ${resultado.errors?.length || 0}`);
      } else {
        throw new Error(resultado.message || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ Erro ao processar:', error);
      alert('❌ Erro ao processar novos cadastros: ' + (error as Error).message);
    } finally {
      setProcessando(false);
    }
  };

  // 🔄 Função para processar ATUALIZAÇÕES (registros marcados pelo usuário)
  const processarAtualizacoes = async () => {
    if (!dadosAnalise || !dadosAnalise.dados) return;
    if (!arquivoAtual) {
      alert('❌ Arquivo não encontrado. Por favor, faça upload novamente.');
      return;
    }

    // Filtra os itens marcados para atualização
    const itensParaAtualizar = dadosAnalise.dados.filter((item: DadosItem) => linhasParaAtualizar.includes(item.linha));
    if (itensParaAtualizar.length === 0) {
      alert('Nenhum registro marcado para atualização. Clique em "Atualizar" nas linhas desejadas.');
      return;
    }

    try {
      setProcessando(true);
      setProgresso(0);

      // Monta o payload para atualização
      const membrosParaAtualizar = itensParaAtualizar.map(item => ({
        ...item
      }));

      // Envia para o backend
      const response = await fetch(apiUrl('/api/members/batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          members: membrosParaAtualizar,
          replaceAll: false
        }),
      });

      const resultado = await response.json();

      if (resultado.success) {
        setEstatisticasFinais({
          total: membrosParaAtualizar.length,
          atualizados: resultado.updated || membrosParaAtualizar.length,
          criados: 0,
          erros: resultado.errors?.length || 0,
          ignorados: resultado.ignored || 0
        });
        setProgresso(100);
        setEtapa('concluido');
        alert(`✅ Atualização concluída!\n\n` +
              `📊 Total: ${membrosParaAtualizar.length}\n` +
              `✅ Atualizados: ${resultado.updated || membrosParaAtualizar.length}\n` +
              `❌ Erros: ${resultado.errors?.length || 0}`);
      } else {
        throw new Error(resultado.message || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ Erro ao processar:', error);
      alert('❌ Erro ao processar atualizações: ' + (error as Error).message);
    } finally {
      setProcessando(false);
    }
  };

  // Calcular estatísticas finais
  const calcularEstatisticasFinais = () => {
    const stats = {
      total: resultados.length,
      criados: resultados.filter(r => r.resultado.acao === 'criado').length,
      atualizados: resultados.filter(r => r.resultado.acao === 'atualizado').length,
      ignorados: resultados.filter(r => r.resultado.acao === 'ignorado').length,
      erros: resultados.filter(r => !r.resultado.sucesso).length
    };
    setEstatisticasFinais(stats);
  };

  // Reset para novo processo
  const reiniciar = () => {
    setEtapa('upload');
    setDadosAnalise(null);
    setProcessando(false);
    setProgresso(0);
    setResultados([]);
    setModalConfirmacao(null);
    setEstatisticasFinais(null);
  };

  // Renderizar etapa de upload
  const renderUpload = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importação de Usuários
        </CardTitle>
        <CardDescription>
          Escolha o modo de importação: Interativa (com confirmação) ou Completa (substitui tudo)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botão de Importação Completa */}
        <div className="border-2 border-destructive/20 bg-destructive/10 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">
                Importar Planilha (Substituir Tudo)
              </h3>
              <p className="text-sm text-destructive mb-3">
                ⚠️ Esta opção irá <strong>LIMPAR TODO O BANCO DE DADOS</strong> e importar apenas os dados do Excel.
                Use apenas quando quiser substituir completamente os dados do sistema.
              </p>
              <input
                type="file"
                id="importar-completo"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) importarCompleto(arquivo);
                }}
              />
              <Button
                variant="destructive"
                onClick={() => document.getElementById('importar-completo')?.click()}
                disabled={processando}
                className="w-full"
              >
                {processando ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Excel e Substituir Tudo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Ou</span>
          </div>
        </div>

        {/* Importação Interativa Original */}
        <div className="border-2 border-border bg-muted rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                Importação Interativa (Recomendado)
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Revise cada linha da planilha e escolha se deseja criar, atualizar ou ignorar cada registro.
                Mais seguro para atualizações parciais.
              </p>
            </div>
          </div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary/60 bg-primary/10' : 'border-border hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            <FileText className="h-12 w-12 mx-auto text-primary/70 mb-4" />
            {isDragActive ? (
              <p className="text-lg">Solte o arquivo aqui...</p>
            ) : (
              <>
                <p className="text-lg mb-2">Arraste um arquivo Excel aqui</p>
                <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizar etapa de análise
  const renderAnalise = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Analisando Arquivo...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin mr-4" />
          <span className="text-lg">Processando dados da planilha...</span>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizar etapa de processamento
  const renderProcessamento = () => {
    // Validação para evitar erro se dadosAnalise for null
    if (!dadosAnalise || !dadosAnalise.estatisticas) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              Processando dados...
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Análise da Importação</CardTitle>
          <CardDescription>
            Revise os dados antes de confirmar as operações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Estatísticas - VISUAL MELHORADO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Card: Novos Cadastros */}
            <div className="bg-card border-2 border-border p-6 rounded-xl shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full p-2">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">Novos Cadastros</h3>
                </div>
                <div className="text-4xl font-bold text-primary">
                  {dadosAnalise.estatisticas.novosUsuarios || dadosAnalise.estatisticas.novos}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Membros que serão <strong>criados</strong> no sistema
              </p>
            </div>

            {/* Card: Atualizações */}
            <div className="bg-card border-2 border-border p-6 rounded-xl shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-warning text-warning-foreground rounded-full p-2">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">Atualizações</h3>
                </div>
                <div className="text-4xl font-bold text-warning">
                  {dadosAnalise.estatisticas.atualizacoes}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Membros existentes com <strong>alterações</strong> detectadas
              </p>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-success/10 border border-success/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-success">Sem Alteração</span>
                <span className="text-2xl font-bold text-success">
                  {dadosAnalise.estatisticas.semAlteracao || 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Registros idênticos ao banco</p>
            </div>
            <div className="bg-muted border border-border p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total de Linhas</span>
                <span className="text-2xl font-bold text-muted-foreground">
                  {dadosAnalise.estatisticas.totalLinhas}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">No arquivo Excel</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <Button onClick={processarTodosAutomaticos}>
              Processar Automáticos
            </Button>
            <Button
              onClick={processarAtualizacoes}
              variant="secondary"
              disabled={linhasParaAtualizar.length === 0}
              style={{ display: 'inline-block', minWidth: 160 }}
            >
              Atualizar Todos {linhasParaAtualizar.length > 0 ? `(${linhasParaAtualizar.length})` : ''}
            </Button>
            <Button variant="outline" onClick={reiniciar}>
              Cancelar
            </Button>
          </div>

          {progresso > 0 && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Progresso</span>
                <span>{Math.round(progresso)}%</span>
              </div>
              <Progress value={progresso} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de dados */}
      <Card>
        <CardHeader>
          <CardTitle>Dados para Processamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: 40 }}>
                  <Checkbox
                    checked={selecionarTodos}
                    onCheckedChange={handleSelecionarTodos}
                    aria-label="Selecionar todos para atualização"
                  />
                </TableHead>
                <TableHead>Linha</TableHead>
                <TableHead>ID Externo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Alterações</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosAnalise.dados.map((item) => {
                const resultado = resultados.find(r => r.linha === item.linha);
                const isNovo = item.acao === 'criar_novo';
                const isAtualizacao = item.acao === 'confirmar_atualizacao';
                const checked = linhasParaAtualizar.includes(item.linha);
                return (
                  <TableRow
                    key={item.linha}
                    className={
                        isNovo ? 'bg-primary/10 hover:bg-primary/20' :
                          isAtualizacao ? 'bg-warning/10 hover:bg-warning/20' :
                          'hover:bg-muted/50'
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => handleSelecionarLinha(item.linha)}
                        aria-label={`Selecionar linha ${item.linha} para atualização`}
                        disabled={!isAtualizacao}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.linha}</TableCell>
                    <TableCell>{item.idExterno || '-'}</TableCell>
                    <TableCell className="font-medium">{item.nomeCompleto || item.nome}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={isNovo ? 'default' : isAtualizacao ? 'destructive' : 'secondary'}
                        className={
                          isNovo ? 'bg-primary text-primary-foreground hover:opacity-95' :
                            isAtualizacao ? 'bg-warning text-warning-foreground hover:opacity-95' :
                            ''
                        }
                      >
                        {isNovo && (
                          <Users className="h-3 w-3 mr-1" />
                        )}
                        {isAtualizacao && (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        {isNovo ? 'NOVO CADASTRO' :
                         isAtualizacao ? 'ATUALIZAÇÃO' :
                         'Sem alteração'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.diferencas && item.diferencas.length > 0 ? (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-warning mb-1">
                            {item.diferencas.length} campo(s) diferente(s):
                          </div>
                          {item.diferencas.map((diff, idx) => (
                            <div key={idx} className="text-xs bg-card p-2 rounded border border-border">
                              <span className="font-medium text-warning">{diff.label}:</span>{' '}
                              <div className="mt-1">
                                <span className="line-through text-muted-foreground">{diff.valorAtual}</span>
                                <span className="text-warning mx-2">→</span>
                                <span className="text-success font-semibold">{diff.valorNovo}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        ) : isNovo ? (
                        <span className="text-primary text-sm font-medium">Novo membro</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem mudanças</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {resultado ? (
                        <Badge variant={resultado.resultado.sucesso ? 'default' : 'destructive'}>
                          {resultado.resultado.sucesso ? 
                            resultado.resultado.acao : 'Erro'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!resultado && (
                        <div className="flex gap-2">
                          {item.acao === 'criar_novo' && (
                            <Button 
                              size="sm" 
                              onClick={() => confirmarAcao(item, 'criar_novo')}
                            >
                              Criar
                            </Button>
                          )}
                          {item.acao === 'confirmar_atualizacao' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => confirmarAcao(item, 'atualizar')}
                              >
                                Atualizar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => confirmarAcao(item, 'ignorar')}
                              >
                                Ignorar
                              </Button>
                            </>
                          )}
                          {item.acao === 'sem_alteracao' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => confirmarAcao(item, 'ignorar')}
                            >
                              OK
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    );
  };

  // Renderizar etapa concluída
  const renderConcluido = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Importação Concluída
        </CardTitle>
      </CardHeader>
      <CardContent>
        {estatisticasFinais && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-success/10 p-4 rounded-lg text-center border border-success/20">
              <div className="text-2xl font-bold text-success">
                {estatisticasFinais.criados}
              </div>
              <div className="text-sm">Usuários criados</div>
            </div>
            <div className="bg-primary/10 p-4 rounded-lg text-center border border-primary/20">
              <div className="text-2xl font-bold text-primary">
                {estatisticasFinais.atualizados}
              </div>
              <div className="text-sm">Usuários atualizados</div>
            </div>
            <div className="bg-muted p-4 rounded-lg text-center border border-border">
              <div className="text-2xl font-bold text-muted-foreground">
                {estatisticasFinais.ignorados}
              </div>
              <div className="text-sm">Ignorados</div>
            </div>
            <div className="bg-destructive/10 p-4 rounded-lg text-center border border-destructive/20">
              <div className="text-2xl font-bold text-destructive">
                {estatisticasFinais.erros}
              </div>
              <div className="text-sm">Erros</div>
            </div>
          </div>
        )}
        
        <Button onClick={reiniciar} className="w-full">
          Nova Importação
        </Button>
      </CardContent>
    </Card>
  );

  // Modal de confirmação
  const renderModalConfirmacao = () => {
    if (!modalConfirmacao) return null;

    const { item } = modalConfirmacao;

    return (
      <Dialog open={!!modalConfirmacao} onOpenChange={() => setModalConfirmacao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Atualização</DialogTitle>
            <DialogDescription>
              O usuário já existe no banco. Deseja aplicar as alterações?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <strong>Usuário:</strong> {item.nomeCompleto || item.nome}
            </div>
            
            {item.diferencas && item.diferencas.length > 0 && (
              <div>
                <strong>Alterações:</strong>
                <div className="mt-2 space-y-2">
                  {item.diferencas.map((diff: {label: string; valorAtual: string; valorNovo: string}, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <div className="font-medium">{diff.label}:</div>
                      <div className="text-sm">
                        <span className="text-destructive">Atual: {diff.valorAtual || '(vazio)'}</span>
                        <br />
                        <span className="text-success">Novo: {diff.valorNovo || '(vazio)'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={modalConfirmacao.onCancel}>
              Cancelar
            </Button>
            <Button onClick={modalConfirmacao.onConfirm}>
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto p-6">
      {etapa === 'upload' && renderUpload()}
      {etapa === 'analise' && renderAnalise()}
      {etapa === 'processamento' && renderProcessamento()}
      {etapa === 'concluido' && renderConcluido()}
      {renderModalConfirmacao()}
    </div>
  );
};

export default ImportacaoInterativa;