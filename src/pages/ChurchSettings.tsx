// Página de configurações da igreja
// Local: src/pages/ChurchSettings.tsx

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, Church } from 'lucide-react';
import { ChurchSettings as ChurchSettingsType } from '@/types/churchSettings';
import { apiAssetUrl, apiUrl } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';

export const ChurchSettings = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ChurchSettingsType>({
    id: 0,
    nome: '',
    denominacao: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    pais: 'Brasil',
    logo_url: ''
  });

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/api/church-settings'));
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else if (response.status === 404) {
        // Configurações ainda não existem, usar valores padrão
        console.log('Configurações não encontradas, usando valores padrão');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as configurações da igreja.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isMobile) loadSettings();
  }, [isMobile, loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(apiUrl('/api/church-settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configurações');
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings);

      toast({
        title: "Configurações salvas!",
        description: "As informações da igreja foram atualizadas com sucesso."
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (isMobile) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <div className="rounded-lg border bg-card p-5 text-center">
          <h1 className="text-lg font-semibold">Disponível somente no desktop</h1>
          <p className="mt-2 text-sm text-muted-foreground">As configurações da igreja podem ser acessadas somente em um computador.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Church className="h-8 w-8" />
          Configurações da Igreja
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure as informações que aparecerão na ficha de cadastro e em outros documentos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Informações da Igreja
          </CardTitle>
          <CardDescription>
            Essas informações serão usadas no cabeçalho das fichas de cadastro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo - Somente Visualização */}
          <div className="space-y-2">
            <Label htmlFor="logo">Logo da Igreja</Label>
            <div className="flex items-center gap-4">
              {settings.logo_url ? (
                <img 
                  src={apiAssetUrl(settings.logo_url)}
                  alt="Logo da Igreja" 
                  className="w-20 h-20 object-contain border rounded"
                />
              ) : (
                <div className="w-20 h-20 border rounded flex items-center justify-center bg-gray-100">
                  <Church className="h-10 w-10 text-gray-400" />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  💡 Para alterar o logo, use o <strong>botão de upload no cabeçalho</strong> da página Dashboard
                </p>
                <p className="text-xs text-muted-foreground">
                  O logo do cabeçalho é automaticamente usado em todas as fichas e documentos
                </p>
              </div>
            </div>
          </div>

          {/* Nome e Denominação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Igreja *</Label>
              <Input
                id="nome"
                value={settings.nome}
                onChange={(e) => setSettings({ ...settings, nome: e.target.value })}
                placeholder="Ex: Igreja Evangélica Quadrangular"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="denominacao">Denominação/Ministério</Label>
              <Input
                id="denominacao"
                value={settings.denominacao}
                onChange={(e) => setSettings({ ...settings, denominacao: e.target.value })}
                placeholder="Ex: Templo Central de Cariacica"
              />
            </div>
          </div>

          {/* Telefone e Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={settings.telefone}
                onChange={(e) => setSettings({ ...settings, telefone: e.target.value })}
                placeholder="(00) 0000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="contato@suaigreja.com.br"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={settings.endereco}
              onChange={(e) => setSettings({ ...settings, endereco: e.target.value })}
              placeholder="Rua, Número, Bairro"
            />
          </div>

          {/* Cidade, Estado, CEP e País */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={settings.cidade}
                onChange={(e) => setSettings({ ...settings, cidade: e.target.value })}
                placeholder="Cariacica"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                value={settings.estado}
                onChange={(e) => setSettings({ ...settings, estado: e.target.value })}
                placeholder="ES"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={settings.cep}
                onChange={(e) => setSettings({ ...settings, cep: e.target.value })}
                placeholder="29140-000"
                maxLength={9}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input
                id="pais"
                value={settings.pais}
                onChange={(e) => setSettings({ ...settings, pais: e.target.value })}
                placeholder="Brasil"
              />
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={loadSettings}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !settings.nome}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pré-visualização */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>
            Como as informações aparecerão na ficha de cadastro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{
            backgroundColor: '#005b7f',
            color: '#fff',
            padding: '30px',
            borderRadius: '8px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: 0,
              width: '100%',
              height: '60px',
              backgroundColor: '#1aa399',
              borderRadius: '50% 50% 0 0',
              transform: 'scaleX(1.5)'
            }} />
            
            <div style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {settings.logo_url ? (
                  <img 
                    src={apiAssetUrl(settings.logo_url)}
                    alt="Logo"
                    style={{ width: '50px', height: '50px', marginRight: '15px', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ fontSize: '40px', marginRight: '15px' }}>⛪</div>
                )}
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{settings.nome || 'Nome da Igreja'}</div>
                  <div>{settings.denominacao || 'Denominação/Ministério'}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '14px' }}>
                <div>{settings.telefone || '(00) 0000-0000'}</div>
                <div>{settings.email || 'contato@igreja.com.br'}</div>
                <div>{settings.endereco || 'Endereço da Igreja'}</div>
                <div>{settings.cidade && settings.estado ? `${settings.cidade}, ${settings.estado}, ${settings.pais}` : 'Cidade, Estado, País'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
