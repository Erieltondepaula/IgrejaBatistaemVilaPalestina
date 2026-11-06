// Cadastros Recebidos - Tela para visualizar formulários recebidos do Google Forms
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Eye, CheckCircle2, XCircle, AlertCircle, Download, Filter, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api';
import axios from 'axios';

interface ReceivedRegistration {
  id_externo: string;
  nome_completo: string;
  data_nascimento: string;
  telefone: string;
  email?: string;
  situacao_atual: string;
  received_at: string;
  status: 'novo' | 'alterado' | 'processado' | 'erro';
  changes?: Array<{ campo: string; atual: string; novo: string }>;
}

const statusConfig = {
  novo: { label: 'Novo', variant: 'default' as const, icon: CheckCircle2, color: 'text-emerald-600' },
  alterado: { label: 'Alterado', variant: 'secondary' as const, icon: AlertCircle, color: 'text-sky-600' },
  processado: { label: 'Processado', variant: 'outline' as const, icon: CheckCircle2, color: 'text-muted-foreground' },
  erro: { label: 'Erro', variant: 'destructive' as const, icon: XCircle, color: 'text-destructive' }
};

export const ReceivedRegistrations = () => {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<ReceivedRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<ReceivedRegistration | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(apiUrl('/api/sync/pending'), { timeout: 60000 });
      if (response.data.sucesso) {
        setRegistrations(response.data.pendentes || []);
      } else {
        throw new Error(response.data.erro || 'Erro ao buscar cadastros');
      }
    } catch (error) {
      console.error('Erro ao buscar cadastros recebidos:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os cadastros recebidos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const filteredRegistrations = registrations.filter(reg => {
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    const searchTerms = searchTerm.split(/[,;\n|]/).map(t => t.trim().toLowerCase()).filter(Boolean);
    const matchesSearch = searchTerms.length === 0 ||
      searchTerms.some(term =>
        reg.nome_completo.toLowerCase().includes(term) ||
        reg.id_externo.toLowerCase().includes(term) ||
        reg.telefone.includes(term)
      );
    return matchesStatus && matchesSearch;
  });

  const handleViewDetails = (reg: ReceivedRegistration) => {
    setSelectedRegistration(reg);
    setIsDetailOpen(true);
  };

  const handleProcessRegistration = async (reg: ReceivedRegistration) => {
    try {
      await axios.post(apiUrl('/api/sync/force'));
      toast({
        title: 'Sincronização iniciada',
        description: 'O cadastro será processado na próxima sincronização.'
      });
      fetchRegistrations();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a sincronização.',
        variant: 'destructive'
      });
    }
  };

  const getStatusInfo = (status: ReceivedRegistration['status']) => statusConfig[status];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cadastros Recebidos</h1>
          <p className="text-sm text-muted-foreground">
            Formulários enviados pelo Google Forms aguardando processamento
          </p>
        </div>
        <Button onClick={fetchRegistrations} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="w-full">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, ID ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="alterado">Alterado</SelectItem>
                  <SelectItem value="processado">Processado</SelectItem>
                  <SelectItem value="erro">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>Total: <strong>{registrations.length}</strong></span>
              <span className="ml-4">Novos: <strong className="text-emerald-600">{registrations.filter(r => r.status === 'novo').length}</strong></span>
              <span className="ml-4">Alterados: <strong className="text-sky-600">{registrations.filter(r => r.status === 'alterado').length}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de cadastros */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Nenhum cadastro encontrado</p>
              <p className="text-sm mt-1">Os formulários enviados aparecerão aqui automaticamente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">ID Externo</TableHead>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead className="w-40">Data Nasc.</TableHead>
                    <TableHead className="w-40">Telefone</TableHead>
                    <TableHead className="w-36">Situação</TableHead>
                    <TableHead className="w-36">Status</TableHead>
                    <TableHead className="w-40">Recebido em</TableHead>
                    <TableHead className="w-36">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg) => {
                    const statusInfo = getStatusInfo(reg.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow key={reg.id_externo} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{reg.id_externo}</TableCell>
                        <TableCell className="font-medium">{reg.nome_completo}</TableCell>
                        <TableCell>{reg.data_nascimento || '-'}</TableCell>
                        <TableCell>{reg.telefone || '-'}</TableCell>
                        <TableCell>{reg.situacao_atual || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className={`gap-1 ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(reg.received_at).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(reg)}
                              className="h-8 w-8"
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(reg.status === 'novo' || reg.status === 'alterado') && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleProcessRegistration(reg)}
                                className="h-8 w-8"
                                title="Processar agora"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cadastro Recebido</DialogTitle>
            <DialogDescription>
              Informações enviadas pelo formulário do Google Forms
            </DialogDescription>
          </DialogHeader>

          {selectedRegistration && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID Externo</label>
                  <p className="font-mono text-sm">{selectedRegistration.id_externo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                  <p className="font-medium">{selectedRegistration.nome_completo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                  <p>{selectedRegistration.data_nascimento || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p>{selectedRegistration.telefone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                  <p>{selectedRegistration.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Situação Informada</label>
                  <p>{selectedRegistration.situacao_atual || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status do Processamento</label>
                  <p>{getStatusInfo(selectedRegistration.status).label}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recebido em</label>
                  <p>{new Date(selectedRegistration.received_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {selectedRegistration.changes && selectedRegistration.changes.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Alterações Detectadas</h4>
                  <div className="space-y-2">
                    {selectedRegistration.changes.map((change, index) => (
                      <div key={index} className="grid grid-cols-[1fr_auto_1fr] gap-4 text-sm">
                        <span className="font-medium">{change.campo}</span>
                        <span className="text-muted-foreground text-center">→</span>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Atual: {change.atual || '(vazio)'}</span>
                          <span className="font-medium text-emerald-600">Novo: {change.novo || '(vazio)'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Fechar</Button>
                {selectedRegistration && (selectedRegistration.status === 'novo' || selectedRegistration.status === 'alterado') && (
                  <Button onClick={() => handleProcessRegistration(selectedRegistration)}>
                    Processar Agora
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Fechar</Button>
            {selectedRegistration && (selectedRegistration.status === 'novo' || selectedRegistration.status === 'alterado') && (
              <Button onClick={() => handleProcessRegistration(selectedRegistration)}>
                Processar Agora
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceivedRegistrations;