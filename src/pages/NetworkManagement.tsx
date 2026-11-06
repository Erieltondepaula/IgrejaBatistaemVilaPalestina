import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Download, Network, RefreshCw, Save, ServerCog } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { APP_VERSION } from '@/constants/appVersion';
import { compareVersions, fetchReleaseManifest, getManifestUrl } from '@/lib/networkUpdates';

type NetworkRole = 'principal' | 'secundaria' | 'configurar-depois';

type NetworkConfig = {
  machineName: string;
  networkName: string;
  networkId: string;
  role: NetworkRole;
  machineIp: string;
  port: string;
  distributionPath: string;
  sourceUrl: string;
  version: string;
};

type ReleaseInfo = Awaited<ReturnType<typeof fetchReleaseManifest>>;

type StoredProfiles = Record<NetworkRole, NetworkConfig>;

const STORAGE_KEY = 'dashboard-network-config-v1';
const PROFILES_KEY = 'dashboard-network-profiles-v1';
const defaultConfig: NetworkConfig = {
  machineName: 'COMPUTADOR-LOCAL',
  networkName: 'Rede Administrativa',
  networkId: 'rede-admin-001',
  role: 'configurar-depois',
  machineIp: '192.168.100.3',
  port: '8081',
  distributionPath: 'D:/Sistema/Distribuicao',
  sourceUrl: 'http://192.168.100.3:8081/latest.json',
  version: APP_VERSION,
};

const createDefaultProfiles = (): StoredProfiles => ({
  principal: { ...defaultConfig, role: 'principal', machineName: 'MAQUINA-PRINCIPAL', networkId: 'rede-admin-001' },
  secundaria: { ...defaultConfig, role: 'secundaria', machineName: 'MAQUINA-SECUNDARIA', networkId: 'rede-admin-001' },
  'configurar-depois': { ...defaultConfig, role: 'configurar-depois', machineName: 'MAQUINA-LOCAL', networkId: 'rede-admin-001' },
});

function normalizeConfig(value: Partial<NetworkConfig>): NetworkConfig {
  const config = { ...defaultConfig, ...value, version: APP_VERSION };

  if (!config.sourceUrl) {
    config.sourceUrl = `http://${config.machineIp}:${config.port}/latest.json`;
  }

  return config;
}

const formatDate = (value?: string) => {
  if (!value) {
    return 'N/A';
  }

  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return value;
  }
};

const NetworkManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [config, setConfig] = useState<NetworkConfig>(defaultConfig);
  const [isLoaded, setIsLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [lastCheckedAt, setLastCheckedAt] = useState<string>('Nunca');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const storedProfiles = window.localStorage.getItem(PROFILES_KEY);
    let restoredConfig: NetworkConfig | null = null;

    if (stored) {
      try {
        restoredConfig = normalizeConfig(JSON.parse(stored) as Partial<NetworkConfig>);
      } catch (error) {
        console.error('Erro ao ler configuração de rede:', error);
      }
    }

    if (restoredConfig) {
      setConfig(restoredConfig);
    } else if (storedProfiles) {
      try {
        const parsed = JSON.parse(storedProfiles) as Partial<StoredProfiles>;
        const role = 'configurar-depois';
        const profile = { ...createDefaultProfiles(), ...parsed }[role];
        setConfig(normalizeConfig(profile));
      } catch (error) {
        console.error('Erro ao ler perfis de rede:', error);
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  }, [config, isLoaded]);

  const persistProfile = (nextConfig: NetworkConfig) => {
    const baseProfiles = createDefaultProfiles();
    const storedProfiles = window.localStorage.getItem(PROFILES_KEY);
    const parsedProfiles = storedProfiles ? JSON.parse(storedProfiles) as Partial<StoredProfiles> : {};
    const mergedProfiles = { ...baseProfiles, ...parsedProfiles };

    mergedProfiles[nextConfig.role] = { ...nextConfig, role: nextConfig.role };
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify(mergedProfiles));
  };

  const refreshServerStatus = useCallback(async (manualMessage?: string) => {
    setServerStatus('checking');
    if (manualMessage) {
      setStatusMessage(manualMessage);
      setStatusType('info');
    }

    try {
      const checkUrl = getManifestUrl({
        machineIp: config.machineIp,
        port: config.port,
        role: config.role,
        sourceUrl: config.sourceUrl,
      });
      await fetchReleaseManifest(checkUrl);
      setServerStatus('online');
      setLastCheckedAt(new Date().toLocaleTimeString('pt-BR'));
      setStatusType('success');
      setStatusMessage(`Servidor de atualização online em ${checkUrl}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar o servidor.';
      setServerStatus('offline');
      setLastCheckedAt(new Date().toLocaleTimeString('pt-BR'));
      setStatusType('error');
      setStatusMessage(`${message} Confira se o servidor de atualizações está ativo na porta configurada.`);
    }
  }, [config.machineIp, config.port, config.role, config.sourceUrl]);

  useEffect(() => {
    if (!isLoaded) return;

    const interval = window.setInterval(() => {
      refreshServerStatus();
    }, 15000);

    refreshServerStatus('Verificando servidor local...');

    return () => window.clearInterval(interval);
  }, [isLoaded, refreshServerStatus]);

  const networkDescriptor = useMemo(() => {
    if (!config.networkName && !config.networkId) {
      return 'Sem rede configurada';
    }

    return `${config.networkName || 'Rede sem nome'} (${config.networkId || 'sem id'})`;
  }, [config.networkId, config.networkName]);

  const saveConfig = () => {
    const nextConfig = { ...config, role: config.role || 'configurar-depois' };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig));
    persistProfile(nextConfig);
    toast({
      title: 'Configuração salva',
      description: 'A rede e a função da máquina foram armazenadas localmente.',
    });
  };

  const switchRole = (role: NetworkRole) => {
    const storedProfiles = window.localStorage.getItem(PROFILES_KEY);
    const parsedProfiles = storedProfiles ? JSON.parse(storedProfiles) as Partial<StoredProfiles> : {};
    const baseProfiles = createDefaultProfiles();
    const profile = { ...baseProfiles, ...parsedProfiles }[role] || { ...defaultConfig, role };
    const nextConfig = normalizeConfig({ ...profile, role });
    setConfig(nextConfig);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig));
  };

  const checkUpdates = async () => {
    try {
      const checkUrl = getManifestUrl(config);
      const payload = await fetchReleaseManifest(checkUrl);
      const remoteVersion = payload.version;
      const fileCount = payload.fileCount ?? payload.files.length;
      const publishedAt = payload.publishedAt ?? '';
      const description = payload.description ?? 'Versão publicada na rede local.';

      setReleaseInfo(payload);

      const installedVersion = APP_VERSION;
      const hasUpdate = compareVersions(remoteVersion, installedVersion) > 0;

      setStatusType(hasUpdate ? 'success' : 'info');
      setStatusMessage(
        hasUpdate
          ? `Atualização disponível: ${installedVersion} -> ${remoteVersion}.`
          : `O sistema já está atualizado na versão ${installedVersion}.`
      );

      toast({
        title: hasUpdate ? 'Atualização disponível' : 'Sistema atualizado',
        description: hasUpdate ? `Nova versão ${remoteVersion} encontrada na rede.` : 'Nenhuma atualização pendente foi detectada.',
      });
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
      setStatusType('error');
      setStatusMessage(error instanceof Error ? error.message : 'Não foi possível contatar o servidor de atualização.');
      toast({
        title: 'Falha na verificação',
        description: error instanceof Error ? error.message : 'Confira se o servidor está ativo e se a URL aponta para latest.json.',
        variant: 'destructive',
      });
    }
  };

  const discoverPrimaryMachine = async () => {
    try {
      const checkUrl = getManifestUrl(config);
      const payload = await fetchReleaseManifest(checkUrl);
      setServerStatus('online');
      setLastCheckedAt(new Date().toLocaleTimeString('pt-BR'));
      setStatusType('success');
      setStatusMessage(`Servidor de atualização encontrado em ${checkUrl}.`);
      toast({
        title: 'Servidor encontrado',
        description: `Manifesto da versão ${payload.version} recebido.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível localizar o servidor de atualização.';
      setServerStatus('offline');
      setLastCheckedAt(new Date().toLocaleTimeString('pt-BR'));
      setStatusType('error');
      setStatusMessage(message);
      toast({
        title: 'Servidor não encontrado',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const applyUpdate = () => {
    navigate('/atualizacao');
  };

  const openDistributionFolder = async () => {
    if (!config.distributionPath) {
      setStatusType('error');
      setStatusMessage('Informe a pasta de distribuição antes de abrir o local.');
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/open-local-folder'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: config.distributionPath.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'Não foi possível abrir a pasta no Windows Explorer.');
      }
      setStatusType('success');
      setStatusMessage(`Abrindo a pasta de distribuição: ${config.distributionPath}`);
    } catch (error) {
      console.error('Erro ao abrir a pasta de distribuição:', error);
      setStatusType('error');
      setStatusMessage(error instanceof Error ? error.message : 'Não foi possível abrir a pasta de distribuição no Windows Explorer.');
    }
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Network className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Rede</h1>
            <p className="text-muted-foreground">
              Configure a rede local, a função da máquina e o processo de verificação e atualização automatizada.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rede</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{networkDescriptor}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Função atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{config.role === 'principal' ? 'Principal' : config.role === 'secundaria' ? 'Secundária' : 'Configurar depois'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status do servidor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-2.5 w-2.5 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500' : serverStatus === 'checking' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <p className="text-sm text-muted-foreground">{serverStatus === 'online' ? 'Online' : serverStatus === 'checking' ? 'Verificando...' : 'Offline'}</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Última checagem: {lastCheckedAt}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Versão local</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{APP_VERSION}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="h-5 w-5" />
              Configuração da máquina
            </CardTitle>
            <CardDescription>
              A configuração é armazenada localmente e pode ser alterada sem mexer no restante do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="machineName">Nome da máquina</Label>
                <Input
                  id="machineName"
                  value={config.machineName}
                  onChange={(e) => setConfig({ ...config, machineName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select
                  value={config.role}
                  onValueChange={(value) => {
                    const role = value as NetworkRole;
                    switchRole(role);
                  }}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="secundaria">Secundária</SelectItem>
                    <SelectItem value="configurar-depois">Configurar depois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="networkName">Nome da rede</Label>
                <Input
                  id="networkName"
                  value={config.networkName}
                  onChange={(e) => setConfig({ ...config, networkName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="networkId">Identificador da rede</Label>
                <Input
                  id="networkId"
                  value={config.networkId}
                  onChange={(e) => setConfig({ ...config, networkId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="machineIp">IP da máquina</Label>
                <Input
                  id="machineIp"
                  value={config.machineIp}
                  onChange={(e) => setConfig((current) => {
                    const machineIp = e.target.value;
                    const currentDefaultUrl = `http://${current.machineIp}:${current.port}/latest.json`;
                    return {
                      ...current,
                      machineIp,
                      sourceUrl: current.sourceUrl === currentDefaultUrl
                        ? `http://${machineIp}:${current.port}/latest.json`
                        : current.sourceUrl,
                    };
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Porta de comunicação</Label>
                <Input
                  id="port"
                  value={config.port}
                  onChange={(e) => setConfig((current) => {
                    const port = e.target.value;
                    const currentDefaultUrl = `http://${current.machineIp}:${current.port}/latest.json`;
                    return {
                      ...current,
                      port,
                      sourceUrl: current.sourceUrl === currentDefaultUrl
                        ? `http://${current.machineIp}:${port}/latest.json`
                        : current.sourceUrl,
                    };
                  })}
                />
                <p className="text-xs text-muted-foreground">A porta deve corresponder à porta do servidor unificado da aplicação e das atualizações.</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="distributionPath">Pasta de distribuição</Label>
                <Input
                  id="distributionPath"
                  value={config.distributionPath}
                  onChange={(e) => setConfig({ ...config, distributionPath: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sourceUrl">URL de origem da atualização</Label>
                <Input
                  id="sourceUrl"
                  value={config.sourceUrl}
                  onChange={(e) => setConfig({ ...config, sourceUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">O endereço deve apontar para latest.json servido pela máquina principal.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={saveConfig} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar configuração
              </Button>
              <Button variant="outline" onClick={discoverPrimaryMachine} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Descobrir principal
              </Button>
              <Button variant="outline" onClick={openDistributionFolder} className="gap-2">
                <ServerCog className="h-4 w-4" />
                Abrir pasta
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Atualização
            </CardTitle>
            <CardDescription>Verificação e aplicação da sincronização na rede.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkUpdates} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Verificar atualizações na rede
            </Button>
            <Button onClick={applyUpdate} variant="secondary" className="w-full gap-2">
              <Download className="h-4 w-4" />
              Abrir tela de atualização
            </Button>

            <div className={`rounded-md border p-3 text-sm ${statusType === 'error' ? 'border-red-200 bg-red-50 text-red-700' : statusType === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
              {statusType === 'error' ? <AlertCircle className="mr-2 inline h-4 w-4" /> : statusType === 'success' ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : <RefreshCw className="mr-2 inline h-4 w-4" />}
              {statusMessage || 'Aguardando verificação da rede.'}
            </div>

            {releaseInfo && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                <p><strong>Versão disponível:</strong> {releaseInfo.version}</p>
                <p><strong>Publicado em:</strong> {formatDate(releaseInfo.publishedAt)}</p>
                <p><strong>Arquivos:</strong> {releaseInfo.fileCount ?? 0}</p>
                <p><strong>Descrição:</strong> {releaseInfo.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NetworkManagement;
