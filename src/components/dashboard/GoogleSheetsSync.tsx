// Componente React para Sincronização com Google Sheets
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Link2, CheckCircle2, XCircle, Globe, Clock, ArrowRight, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';
import { useAppContext } from '@/contexts/useAppContext';

interface SyncResult {
  sucesso: boolean;
  total_processados?: number;
  importados?: number;
  atualizados?: number;
  timestamp?: string;
  erro?: string;
  mensagem?: string;
}

interface PreviewFieldChange {
  campo: string;
  atual: unknown;
  novo: unknown;
}

interface PreviewMemberChange {
  nome: string;
  acao: 'novo' | 'atualizado';
  ultima_atualizacao: string | null;
  campos: PreviewFieldChange[];
}

interface SyncPreview {
  sucesso: boolean;
  previewId: string;
  total_processados: number;
  novos: number;
  atualizados: number;
  sem_alteracao: number;
  alteracoes: PreviewMemberChange[];
}

const formatFieldValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '(vazio)';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'string') {
    const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) return `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
  }
  return String(value);
};

export const GoogleSheetsSync = () => {
  const { toast } = useToast();
  const { onRefresh } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [pendingPreview, setPendingPreview] = useState<SyncPreview | null>(null);

  /**
   * Compara os dados e aguarda confirmação antes de gravar.
   */
  const handleCompare = async (testConnectionFirst: boolean) => {
    setTesting(true);
    try {
      if (testConnectionFirst) {
        await axios.get(apiUrl('/api/sync/google-sheets/test'), { timeout: 30000 });
      }

      const response = await axios.post<SyncPreview>(
        apiUrl('/api/sync/google-sheets/preview'),
        {},
        { timeout: 60000 }
      );

      const resultado = response.data;
      if (!resultado.sucesso) throw new Error('Não foi possível comparar os dados da planilha.');
      setPendingPreview(resultado);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.mensagem || error.message
        : error instanceof Error ? error.message : 'Erro ao comparar a planilha';

      toast({
        title: 'Falha ao comparar Google Sheets',
        description: errorMessage,
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleConfirmUpdate = async () => {
    if (!pendingPreview) return;

    setLoading(true);
    try {
      const response = await axios.post<SyncResult>(
        apiUrl('/api/sync/google-sheets/apply'),
        { previewId: pendingPreview.previewId },
        { timeout: 60000 }
      );

      const resultado = response.data;
      if (!resultado.sucesso) throw new Error(resultado.mensagem || 'Falha ao aplicar as atualizações.');

      setLastSync(resultado);
      setPendingPreview(null);
      onRefresh();
      toast({
        title: 'Atualizações aplicadas',
        description: `${resultado.importados || 0} novos e ${resultado.atualizados || 0} atualizados.`,
        duration: 6000,
      });
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.mensagem || error.message
        : error instanceof Error ? error.message : 'Falha ao aplicar as atualizações.';
      toast({ title: 'Erro ao atualizar', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-green-600" />
          Sincronização Google Sheets
          <span className="ml-auto text-xs bg-primary/10 text-primary-foreground px-2 py-1 rounded-full font-medium">
            Confirmação manual
          </span>
        </CardTitle>
        <CardDescription>
          Compare a planilha com os cadastros. O webhook apenas notifica; os dados só mudam após sua confirmação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status da última sincronização */}
        {lastSync ? (
          <div className={`p-4 rounded-lg border ${
            lastSync.sucesso 
              ? 'bg-success/10 border-success/20' 
              : 'bg-destructive/10 border-destructive/20'
          }`} aria-live="polite">
            <div className="flex items-start gap-3">
              {lastSync.sucesso ? (
                <CheckCircle2 className="h-5 w-5 text-success-foreground mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive-foreground mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  lastSync.sucesso ? 'text-success-foreground' : 'text-destructive-foreground'
                }`}>
                  {lastSync.sucesso ? 'Última sincronização bem-sucedida' : 'Erro na sincronização'}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {lastSync.importados != null && (
                    <div className="rounded-md bg-card p-3 border border-border text-sm text-card-foreground">
                      <div className="font-semibold text-foreground">Importados</div>
                      <div>{lastSync.importados}</div>
                    </div>
                  )}
                  {lastSync.atualizados != null && (
                    <div className="rounded-md bg-card p-3 border border-border text-sm text-card-foreground">
                      <div className="font-semibold text-foreground">Atualizados</div>
                      <div>{lastSync.atualizados}</div>
                    </div>
                  )}
                  {lastSync.total_processados != null && (
                    <div className="rounded-md bg-card p-3 border border-border text-sm text-card-foreground">
                      <div className="font-semibold text-foreground">Processados</div>
                      <div>{lastSync.total_processados}</div>
                    </div>
                  )}
                </div>
                {lastSync.mensagem && (
                  <p className="text-sm text-muted-foreground mt-3">{lastSync.mensagem}</p>
                )}
                {lastSync.erro && (
                  <p className="text-sm text-destructive-foreground mt-3">{lastSync.erro}</p>
                )}
                {lastSync.timestamp && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(lastSync.timestamp).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
            Teste a conexão para comparar a planilha com o sistema. Nenhuma alteração manual será gravada sem sua confirmação.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Button
            size="lg"
            onClick={() => handleCompare(false)}
            disabled={loading || testing}
            className="w-full"
          >
            {testing ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Comparando planilha...</>
            ) : (
              <><FileSpreadsheet className="mr-2 h-4 w-4" />Importar da Planilha (Google Sheets)</>
            )}
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => handleCompare(true)}
            disabled={loading || testing}
            className="w-full"
          >
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testando e comparando...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Testar Conexão
              </>
            )}
          </Button>
        </div>

        <Dialog
          open={pendingPreview !== null}
          onOpenChange={(open) => {
            if (!open && !loading) setPendingPreview(null);
          }}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Atualizações pendentes</DialogTitle>
              <DialogDescription>
                {pendingPreview && `${pendingPreview.novos} novos cadastros e ${pendingPreview.atualizados} cadastros com alterações. Nada será gravado até você confirmar.`}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[50vh] divide-y overflow-y-auto pr-1">
              {pendingPreview?.alteracoes.length === 0 ? (
                <div className="rounded-md border bg-muted/40 p-4 text-sm">
                  <h3 className="font-semibold">Nenhuma atualização pendente</h3>
                  <p className="mt-1 text-muted-foreground">
                    {pendingPreview.total_processados} registros conferidos. A planilha e o sistema estão iguais.
                  </p>
                </div>
              ) : pendingPreview?.alteracoes.map((alteracao, index) => (
                <section key={`${alteracao.nome}-${index}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{alteracao.nome}</h3>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${alteracao.acao === 'novo' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                      {alteracao.acao === 'novo' ? 'Novo cadastro' : 'Atualização'}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {alteracao.ultima_atualizacao
                      ? `Última atualização no sistema: ${new Date(alteracao.ultima_atualizacao).toLocaleString('pt-BR')}`
                      : 'Ainda não existe cadastro deste membro no sistema.'}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {alteracao.campos.map((campo, fieldIndex) => (
                      <li key={`${campo.campo}-${fieldIndex}`} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
                        <span className="font-medium">{campo.campo}</span>
                        <span className="text-muted-foreground" aria-label="para"><ArrowRight className="mt-0.5 h-4 w-4" /></span>
                        <span className="break-words text-right">
                          {alteracao.acao === 'novo' ? formatFieldValue(campo.novo) : `${formatFieldValue(campo.atual)} → ${formatFieldValue(campo.novo)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setPendingPreview(null)} disabled={loading}>
                {pendingPreview && pendingPreview.novos + pendingPreview.atualizados === 0 ? 'Fechar' : 'Não, cancelar'}
              </Button>
              <Button onClick={handleConfirmUpdate} disabled={loading || !pendingPreview || pendingPreview.novos + pendingPreview.atualizados === 0}>
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Sim, atualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="bg-muted rounded-lg p-4 border border-border">
          <h4 className="font-medium text-foreground mb-2">Antes de sincronizar</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>A conexão é testada e os valores são comparados com os cadastros.</li>
            <li>A prévia mostra os novos registros e cada campo que mudará.</li>
            <li>Escolha “Sim, atualizar” para gravar ou “Não, cancelar” para descartar a prévia.</li>
          </ul>
        </div>

        {/* Link da planilha */}
        <div className="text-xs text-muted-foreground p-3 bg-muted rounded border border-border">
          <strong>Planilha Configurada:</strong>
          <br />
          <a 
            href="https://docs.google.com/spreadsheets/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            Abrir Google Sheets →
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
