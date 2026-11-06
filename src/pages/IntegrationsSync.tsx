// Integrações e Sincronização - Tela aprimorada para monitoramento
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RefreshCw, Link2, CheckCircle2, XCircle, Globe, Clock, ArrowRight, FileSpreadsheet, Loader2, Settings, Activity, Database, Cloud, Wifi, AlertTriangle, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api';
import axios from 'axios';
import { ReceivedRegistrations } from './ReceivedRegistrations';

interface SyncStatus {
  sucesso: boolean;
  configurado: boolean;
  url_planilha: string;
  webhook_ativo: boolean;
  ultima_sincronizacao: string;
  mensagem: string;
  conexao_ok?: boolean;
  total_registros?: number;
  preview?: unknown[];
}

interface AutoSyncStatus {
  isRunning: boolean;
  intervalActive: boolean;
  lastSync: SyncHistoryEntry | null;
  history: SyncHistoryEntry[];
}

interface SyncHistoryEntry {
  timestamp: string;
  success: boolean;
  total: number;
  new: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string;
  duration: number;
  details?: SyncErrorDetail[];
}

interface SyncErrorDetail {
  member: string;
  error: string;
}

export const IntegrationsSync = () => {
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'auto' | 'history' | 'pending'>('overview');
  const [showDetail, setShowDetail] = useState<SyncHistoryEntry | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [syncRes, autoRes] = await Promise.all([
        axios.get(apiUrl('/api/sync/google-sheets/status'), { timeout: 30000 }),
        axios.get(apiUrl('/api/sync/status'), { timeout: 30000 })
      ]);

      if (syncRes.data.sucesso) setSyncStatus(syncRes.data);
      if (autoRes.data.sucesso) setAutoSyncStatus(autoRes.data);
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await axios.get(apiUrl('/api/sync/test'), { timeout: 30000 });
      if (response.data.sucesso) {
        setSyncStatus(prev => prev ? { ...prev, ...response.data } : response.data);
        toast({
          title: 'Conexão OK',
          description: `Planilha acessível - ${response.data.total_registros} registros encontrados`
        });
      } else {
        throw new Error(response.data.erro || 'Falha no teste');
      }
    } catch (error) {
      toast({
        title: 'Erro na conexão',
        description: error instanceof Error ? error.message : 'Não foi possível conectar',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleForceSync = async () => {
    setLoading(true);
    try {
      const response = await axios.post(apiUrl('/api/sync/force'), {}, { timeout: 120000 });
      if (response.data.sucesso) {
        toast({
          title: 'Sincronização concluída',
          description: `${response.data.new} novos, ${response.data.updated} atualizados`
        });
        fetchStatus();
      } else {
        throw new Error(response.data.erro || 'Falha na sincronização');
      }
    } catch (error) {
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Falha ao sincronizar',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartAutoSync = async () => {
    try {
      await axios.post(apiUrl('/api/sync/start'), { intervalMinutes: 5 });
      toast({ title: 'Sincronização automática iniciada', description: 'Verificando a cada 5 minutos' });
      fetchStatus();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível iniciar', variant: 'destructive' });
    }
  };

  const handleStopAutoSync = async () => {
    try {
      await axios.post(apiUrl('/api/sync/stop'));
      toast({ title: 'Sincronização automática parada' });
      fetchStatus();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível parar', variant: 'destructive' });
    }
  };

  const getStatusColor = (success: boolean) => success ? 'text-emerald-600' : 'text-destructive';
  const getStatusBg = (success: boolean) => success ? 'bg-emerald-50 border-emerald-200' : 'bg-destructive-50 border-destructive-200';

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Integrações e Sincronização
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoramento da comunicação entre Google Sheets e PostgreSQL
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
            <Link2 className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testando...' : 'Testar Conexão'}
          </Button>
          <Button onClick={handleForceSync} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Google Sheets Status */}
        <Card className={`${getStatusBg(syncStatus?.conexao_ok ?? false)} border`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${syncStatus?.conexao_ok ? 'bg-emerald-100' : 'bg-destructive-100'}`}>
                {syncStatus?.conexao_ok ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Google Sheets</p>
                <p className={getStatusColor(syncStatus?.conexao_ok ?? false)}>
                  {syncStatus?.conexao_ok ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
            </div>
            {syncStatus?.total_registros && (
              <p className="mt-2 text-sm text-muted-foreground">
                {syncStatus.total_registros} registros na planilha
              </p>
            )}
          </CardContent>
        </Card>

        {/* PostgreSQL Status */}
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-emerald-100">
                <Database className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">PostgreSQL</p>
                <p className="text-emerald-600">Conectado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto Sync Status */}
        <Card className={`${autoSyncStatus?.intervalActive ? 'bg-emerald-50 border-emerald-200' : 'bg-muted'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${autoSyncStatus?.intervalActive ? 'bg-emerald-100' : 'bg-muted'}`}>
                {autoSyncStatus?.intervalActive ? (
                  <Activity className="h-6 w-6 text-emerald-600" />
                ) : (
                  <Cloud className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sincronização Automática</p>
                <p className={autoSyncStatus?.intervalActive ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {autoSyncStatus?.intervalActive ? 'Ativa (5 min)' : 'Parada'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Sync */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-sky-100">
                <Clock className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Última Sincronização</p>
                <p className={autoSyncStatus?.lastSync?.success ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {autoSyncStatus?.lastSync 
                    ? new Date(autoSyncStatus.lastSync.timestamp).toLocaleString('pt-BR')
                    : 'Nunca executada'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="auto">Automática</TabsTrigger>
          <TabsTrigger value="pending">Cadastros Recebidos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Last Sync Details */}
          {autoSyncStatus?.lastSync && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Última Sincronização Automática
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-2xl font-bold text-emerald-600">{autoSyncStatus.lastSync.new}</p>
                    <p className="text-sm text-emerald-700">Novos Cadastros</p>
                  </div>
                  <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                    <p className="text-2xl font-bold text-sky-600">{autoSyncStatus.lastSync.updated}</p>
                    <p className="text-sm text-sky-700">Atualizados</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-2xl font-bold text-gray-600">{autoSyncStatus.lastSync.skipped}</p>
                    <p className="text-sm text-gray-600">Sem Alterações</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    autoSyncStatus.lastSync.errors > 0 
                      ? 'bg-destructive-50 border-destructive-200' 
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <p className={`text-2xl font-bold ${autoSyncStatus.lastSync.errors > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {autoSyncStatus.lastSync.errors}
                    </p>
                    <p className="text-sm">{autoSyncStatus.lastSync.errors > 0 ? 'Erros' : 'Sem Erros'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Duração: <strong>{formatDuration(autoSyncStatus.lastSync.duration)}</strong></span>
                  <span>•</span>
                  <span>Processados: <strong>{autoSyncStatus.lastSync.total}</strong></span>
                  <span>•</span>
                  <span>{new Date(autoSyncStatus.lastSync.timestamp).toLocaleString('pt-BR')}</span>
                </div>
                {autoSyncStatus.lastSync.errors > 0 && autoSyncStatus.lastSync.details && (
                  <div className="p-4 bg-destructive-50 border border-destructive-200 rounded-lg">
                    <h4 className="font-medium text-destructive mb-2">Erros Encontrados</h4>
                    <ul className="space-y-1 text-sm text-destructive">
                      {autoSyncStatus.lastSync.details.map((err, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="font-mono text-xs">{err.member}</span>
                          <span>{err.error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Button 
                  size="lg" 
                  onClick={handleForceSync} 
                  disabled={loading}
                  className="w-full gap-2 justify-start"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Sincronizando...' : 'Executar Sincronização Manual'}
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleTestConnection} 
                  disabled={testing}
                  className="w-full gap-2 justify-start"
                >
                  <Link2 className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Testando...' : 'Testar Conexão Google Sheets'}
                </Button>
                <div className="sm:col-span-2">
                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <h4 className="font-medium mb-2">Configuração da Planilha</h4>
                    <a 
                      href="https://docs.google.com/spreadsheets/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Abrir Google Sheets Configurada
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto Sync Tab */}
        <TabsContent value="auto" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sincronização Automática
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${autoSyncStatus?.intervalActive ? 'bg-emerald-100' : 'bg-muted'}`}>
                  {autoSyncStatus?.intervalActive ? (
                    <Activity className="h-6 w-6 text-emerald-600 animate-pulse" />
                  ) : (
                    <Cloud className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {autoSyncStatus?.intervalActive ? 'Ativa - Verificando a cada 5 minutos' : 'Parada'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    O serviço verifica automaticamente novos cadastros no Google Sheets e grava no PostgreSQL
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                {autoSyncStatus?.intervalActive ? (
                  <Button variant="destructive" onClick={handleStopAutoSync} className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Parar Sincronização
                  </Button>
                ) : (
                  <Button onClick={handleStartAutoSync} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Iniciar Sincronização Automática
                  </Button>
                )}
                <Button variant="outline" onClick={handleForceSync} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Sincronizar Agora
                </Button>
              </div>

              <div className="bg-muted p-4 rounded-lg border border-border">
                <h4 className="font-medium mb-3">Como Funciona</h4>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>O serviço roda em background no servidor (não depende do navegador aberto)</li>
                  <li>Consulta o Google Sheets a cada 5 minutos via CSV público</li>
                  <li>Compara com o PostgreSQL usando <code className="bg-background px-1 rounded">id_externo</code> como chave</li>
                  <li>Novos registros são inseridos, existentes são atualizados se houver diferenças</li>
                  <li>Registros idênticos são ignorados (preservando avatars e histórico)</li>
                  <li>Logs de cada execução ficam disponíveis na aba Histórico</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Registrations Tab */}
        <TabsContent value="pending">
          <ReceivedRegistrations />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Sincronizações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {autoSyncStatus?.history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Nenhuma sincronização registrada ainda</p>
                  <p className="text-sm mt-1">O histórico aparecerá conforme as sincronizações forem executadas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Data/Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-32">Processados</TableHead>
                        <TableHead className="w-28">Novos</TableHead>
                        <TableHead className="w-28">Atualizados</TableHead>
                        <TableHead className="w-24">Erros</TableHead>
                        <TableHead className="w-28">Duração</TableHead>
                        <TableHead className="w-36">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {autoSyncStatus.history.map((entry: SyncHistoryEntry, index: number) => (
                        <TableRow key={index} className="hover:bg-muted/50 cursor-pointer" onClick={() => setShowDetail(entry)}>
                          <TableCell className="text-sm font-mono">
                            {new Date(entry.timestamp).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.success ? 'default' : 'destructive'}>
                              {entry.success ? 'Sucesso' : 'Falha'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{entry.total}</TableCell>
                          <TableCell className="text-center text-emerald-600 font-medium">{entry.new}</TableCell>
                          <TableCell className="text-center text-sky-600 font-medium">{entry.updated}</TableCell>
                          <TableCell className={`text-center font-medium ${entry.errors > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                            {entry.errors}
                          </TableCell>
                          <TableCell className="text-center text-sm font-mono">{formatDuration(entry.duration)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setShowDetail(entry); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={!!showDetail} onOpenChange={open => !open && setShowDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Sincronização</DialogTitle>
            <DialogDescription>
              {showDetail ? new Date(showDetail.timestamp).toLocaleString('pt-BR') : ''}
            </DialogDescription>
          </DialogHeader>

          {showDetail && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className={`p-4 rounded-lg border ${showDetail.success ? 'bg-emerald-50 border-emerald-200' : 'bg-destructive-50 border-destructive-200'}`}>
                  <p className="text-2xl font-bold">{showDetail.total}</p>
                  <p className="text-sm text-muted-foreground">Total Processados</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-2xl font-bold text-emerald-600">{showDetail.new}</p>
                  <p className="text-sm text-emerald-700">Novos</p>
                </div>
                <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                  <p className="text-2xl font-bold text-sky-600">{showDetail.updated}</p>
                  <p className="text-sm text-sky-700">Atualizados</p>
                </div>
                <div className={`p-4 rounded-lg border ${showDetail.errors > 0 ? 'bg-destructive-50 border-destructive-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className={`text-2xl font-bold ${showDetail.errors > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{showDetail.errors}</p>
                  <p className="text-sm">{showDetail.errors > 0 ? 'Erros' : 'Sem Erros'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                <span>Duração: <strong>{formatDuration(showDetail.duration)}</strong></span>
                <span>•</span>
                <span>Iniciado: <strong>{new Date(showDetail.timestamp).toLocaleString('pt-BR')}</strong></span>
              </div>

              {showDetail.details && showDetail.details.length > 0 && (
                <div className="p-4 bg-destructive-50 border border-destructive-200 rounded-lg">
                  <h4 className="font-medium text-destructive mb-2">Erros Encontrados</h4>
                  <ul className="space-y-1 text-sm text-destructive">
                    {showDetail.details.map((err, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-mono text-xs">{err.member}</span>
                        <span>{err.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showDetail.message && (
                <div className="p-4 bg-muted rounded-lg border border-border">
                  <p className="text-sm">{showDetail.message}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetail(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsSync;