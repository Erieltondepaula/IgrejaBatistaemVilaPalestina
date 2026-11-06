import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_VERSION } from '@/constants/appVersion';
import { apiUrl } from '@/lib/api';
import {
  compareVersions,
  fetchReleaseManifest,
  getManifestUrl,
  readNetworkUpdateConfig,
  type ReleaseManifest,
} from '@/lib/networkUpdates';

type UpdateState = 'checking' | 'available' | 'current' | 'error' | 'starting' | 'running' | 'complete';
type UpdateJob = { status: 'awaiting-approval' | 'running' | 'completed' | 'failed'; message?: string };

const NetworkUpdatePage = () => {
  const [manifest, setManifest] = useState<ReleaseManifest | null>(null);
  const [state, setState] = useState<UpdateState>('checking');
  const [message, setMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    setState('checking');
    setMessage('');
    try {
      const config = readNetworkUpdateConfig();
      const latest = await fetchReleaseManifest(getManifestUrl(config));
      setManifest(latest);
      setState(compareVersions(latest.version, APP_VERSION) > 0 ? 'available' : 'current');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível verificar atualizações.');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkForUpdates();
  }, [checkForUpdates]);

  useEffect(() => {
    if (state !== 'complete') return;
    const reloadTimer = window.setTimeout(() => window.location.reload(), 3000);
    return () => window.clearTimeout(reloadTimer);
  }, [state]);

  const applyUpdate = async () => {
    if (!manifest) return;
    setState('starting');
    setMessage('Solicitando autorização do Windows para atualizar este computador...');
    try {
      const config = readNetworkUpdateConfig();
      const response = await fetch(apiUrl('/api/system/updates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl: getManifestUrl(config) }),
      });
      const payload = await response.json() as { updateId?: string; message?: string };
      if (!response.ok || !payload.updateId) {
        throw new Error(payload.message || 'Não foi possível iniciar a atualização neste computador.');
      }

      setState('running');
      setMessage('Confirme a janela do Windows, se aparecer. A atualização será aplicada com backup dos arquivos substituídos.');
      const startedAt = Date.now();
      while (Date.now() - startedAt < 10 * 60 * 1000) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const statusResponse = await fetch(apiUrl(`/api/system/updates/${payload.updateId}`), { cache: 'no-store' });
        if (!statusResponse.ok) throw new Error('Não foi possível consultar o andamento da atualização.');
        const job = await statusResponse.json() as UpdateJob;
        if (job.status === 'completed') {
          setState('complete');
          setMessage('Atualização concluída. O sistema será recarregado.');
          return;
        }
        if (job.status === 'failed') {
          throw new Error(job.message || 'O processo de atualização não foi concluído.');
        }
        setMessage(job.status === 'awaiting-approval'
          ? 'Aguardando a autorização do Windows para atualizar.'
          : 'Baixando e aplicando os arquivos da atualização...');
      }
      throw new Error('A atualização ainda está em andamento. Aguarde e recarregue o sistema.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível aplicar a atualização.');
    }
  };

  const isBusy = state === 'starting' || state === 'running';

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Atualização pela rede
          </CardTitle>
          <CardDescription>
            Esta tela verifica e instala a versão publicada pela máquina principal, mantendo backup dos arquivos alterados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
            <p className="text-sm text-muted-foreground">Versão neste computador: <strong className="text-foreground">{APP_VERSION}</strong></p>
            <p className="text-sm text-muted-foreground">Versão na rede: <strong className="text-foreground">{manifest?.version || '—'}</strong></p>
          </div>

          {message && (
            <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${state === 'error' ? 'border-destructive/40 text-destructive' : 'border-primary/30 text-foreground'}`}>
              {state === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : state === 'complete' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : null}
              <span>{message}</span>
            </div>
          )}

          {state === 'available' && (
            <p className="text-sm text-muted-foreground">
              {manifest?.fileCount ?? manifest?.files.length ?? 0} arquivos no pacote. Ao continuar, o Windows poderá pedir autorização para gravar na pasta de instalação.
            </p>
          )}
          {state === 'current' && (
            <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />Este computador já está atualizado.</p>
          )}
          {isBusy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Processando atualização...</p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => void checkForUpdates()} disabled={isChecking || isBusy}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              Verificar atualização
            </Button>
            {state === 'available' && (
              <Button onClick={() => void applyUpdate()}>
                <Download className="mr-2 h-4 w-4" />
                Atualizar agora
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link to="/">Voltar ao sistema</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkUpdatePage;
