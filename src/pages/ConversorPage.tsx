import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useIsMobile } from '@/hooks/use-mobile';

export const ConversorPage = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalRegistros: number;
    dataPronto: boolean;
  } | null>(null);
  const [dadosConvertidos, setDadosConvertidos] = useState<any[]>([]);

  const converterArquivo = async (file: File) => {
    setLoading(true);
    try {
      console.log('📖 Lendo arquivo original...');
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      
      if (jsonData.length === 0) {
        throw new Error('O arquivo está vazio');
      }

      console.log(`✅ ${jsonData.length} registros encontrados`);

      // Mapear dados para o formato do banco
      const dadosMapeados = jsonData.map((row: any) => {
        // Extrair nome e sobrenome
        const nomeCompleto = String(row['nome'] || row['Nome Completo'] || '').trim();
        const partesNome = nomeCompleto.split(' ');
        const primeiroNome = partesNome[0] || '';
        const sobrenome = partesNome.slice(1).join(' ') || partesNome[0] || '';
        
        return {
          'Id': '',  // Será gerado automaticamente
          'id_externo': row['Id'] || '',
          'nome': primeiroNome,
          'sobrenome': sobrenome,
          'Nome Completo': row['Nome Completo'] || nomeCompleto,
          'data_nascimento': row['data_nascimento'] || '',
          'idade': row['idade'] || '',
          'mes': row['mes'] || '',
          'telefone': row['telefone'] || '',
          'sexo': row['sexo'] || '',
          'observacoes': row['observacoes'] || '',
          'status_civil': row['status_civil'] || '',
          'nome_conjuge ': row['nome_conjuge '] || '',
          'parentesco ': row['parentesco '] || '',
          'rua': row['rua'] || '',
          'numero': row['numero'] || '',
          'bairro': row['bairro'] || '',
          'cidade': row['cidade'] || '',
          'estado': row['estado'] || '',
          'cep': row['cep'] || '',
          'batizado': row['batizado'] || '',
          'membro': row['membro'] || '',
          'situacao_atual': row['situacao_atual'] || '',
          'e_lider': row['e_lider'] || '',
          'e_professor_ebq\n': row['e_professor_ebq\n'] || row['e_professor_ebq'] || '',
          'faixa_etaria ': row['faixa_etaria '] || row['faixa_etaria'] || '',
          'Está em um pequeno grupo ?': row['Está em um pequeno grupo ?'] || '',
          'grupo': row['grupo'] || '',
          'numerodomes': row['numerodomes'] || ''
        };
      });

      setDadosConvertidos(dadosMapeados);
      setStats({
        totalRegistros: dadosMapeados.length,
        dataPronto: true
      });

      toast({
        title: 'Arquivo convertido com sucesso!',
        description: `${dadosMapeados.length} registros prontos para download`,
        variant: 'default'
      });

    } catch (error: unknown) {
      console.error('❌ Erro na conversão:', error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao converter arquivo",
        description: errorMessage,
        variant: "destructive"
      });
      setStats(null);
      setDadosConvertidos([]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    converterArquivo(file);
  };

  const handleDownload = () => {
    if (dadosConvertidos.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Faça upload de um arquivo primeiro",
        variant: "destructive"
      });
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(dadosConvertidos);
      
      // Definir larguras das colunas
      worksheet['!cols'] = [
        { wch: 5 },   // Id
        { wch: 12 },  // id_externo
        { wch: 15 },  // nome
        { wch: 15 },  // sobrenome
        { wch: 30 },  // Nome Completo
        { wch: 18 },  // data_nascimento
        { wch: 8 },   // idade
        { wch: 12 },  // mes
        { wch: 15 },  // telefone
        { wch: 12 },  // sexo
        { wch: 30 },  // observacoes
        { wch: 15 },  // status_civil
        { wch: 25 },  // nome_conjuge
        { wch: 25 },  // parentesco
        { wch: 25 },  // rua
        { wch: 8 },   // numero
        { wch: 20 },  // bairro
        { wch: 15 },  // cidade
        { wch: 8 },   // estado
        { wch: 12 },  // cep
        { wch: 12 },  // batizado
        { wch: 10 },  // membro
        { wch: 15 },  // situacao_atual
        { wch: 12 },  // e_lider
        { wch: 18 },  // e_professor_ebq
        { wch: 25 },  // faixa_etaria
        { wch: 28 },  // Está em um pequeno grupo?
        { wch: 25 },  // grupo
        { wch: 12 }   // numerodomes
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Membros');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
      });
      
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `membros-convertido-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download iniciado!',
        description: 'Arquivo pronto para importar no sistema',
        variant: 'default'
      });

    } catch (error) {
      console.error('❌ Erro no download:', error);
      toast({
        title: "Erro ao baixar arquivo",
        description: "Tente novamente",
        variant: "destructive"
      });
    }
  };

  if (isMobile) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="rounded-lg border bg-card p-5 text-center">
          <h1 className="text-lg font-semibold">Disponível somente no desktop</h1>
          <p className="mt-2 text-sm text-muted-foreground">O conversor de arquivos não pode ser acessado em dispositivos móveis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Conversor de Arquivos</h1>
          <p className="text-xl text-muted-foreground">
            Converta seu arquivo original para o formato do banco de dados
          </p>
        </div>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Como Usar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold mb-2">
                  1
                </div>
                <h3 className="font-semibold mb-1">Upload</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione o arquivo original XLSX
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold mb-2">
                  2
                </div>
                <h3 className="font-semibold mb-1">Conversão</h3>
                <p className="text-sm text-muted-foreground">
                  Aguarde a conversão automática
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold mb-2">
                  3
                </div>
                <h3 className="font-semibold mb-1">Download</h3>
                <p className="text-sm text-muted-foreground">
                  Baixe o arquivo convertido
                </p>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 mt-4 border border-border">
              <h4 className="font-semibold text-foreground mb-2">
                O que o conversor faz:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ Separa nome e sobrenome automaticamente</li>
                <li>✅ Formata datas para DD/MM/YYYY</li>
                <li>✅ Preserva o ID original como "id_externo"</li>
                <li>✅ Adiciona colunas obrigatórias do banco</li>
                <li>✅ Mantém todos os dados originais</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Upload do Arquivo Original</CardTitle>
            <CardDescription>
              Selecione o arquivo XLSX original para converter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <Button
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="mb-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Processando...' : 'Selecionar Arquivo'}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Formatos aceitos: .xlsx, .xls
              </p>
              <Input
                id="upload-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={loading}
                ref={fileInputRef}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        {stats && (
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                <CheckCircle2 className="h-5 w-5" />
                Conversão Concluída
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total de Registros</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.totalRegistros}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    Pronto para Download
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                onClick={handleDownload}
                className="w-full"
                variant="default"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Arquivo Convertido
              </Button>

              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Próximo Passo
                </h4>
                <p className="text-sm text-muted-foreground">
                  Após baixar o arquivo, vá para a página <strong>Dashboard</strong> e use a opção 
                  <strong> "Importar Planilha (Substitui Tudo)"</strong> para enviar os dados ao banco de dados.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rodapé Informativo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • O arquivo convertido terá <strong>30 colunas</strong> mapeadas para o banco de dados
            </p>
            <p>
              • Campos calculados (idade, faixa etária) serão recalculados na importação
            </p>
            <p>
              • IDs personalizados serão gerados automaticamente ao importar
            </p>
            <p>
              • O arquivo original não é modificado, apenas convertido para download
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConversorPage;
