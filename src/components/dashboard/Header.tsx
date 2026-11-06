// Local do arquivo: src/components/dashboard/Header.tsx
// ✅ CÓDIGO FINAL CORRIGIDO

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { Upload, Church, Edit, Check, Users, UserCheck, UserX, Heart } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Member } from '@/types/member';
import { apiAssetUrl, apiUrl } from '@/lib/api';

interface HeaderProps {
  members: Member[];
  onCardClick: (status?: 'ativo' | 'desligado') => void;
}

export const Header = ({ members, onCardClick }: HeaderProps) => {
  const [logoUrl, setLogoUrl] = useLocalStorage<string>('church-logo', '');
  const [churchName, setChurchName] = useLocalStorage<string>('church-name', 'Dashboard de Membros');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(churchName);

  // Carregar logo do banco de dados ao inicializar
  useEffect(() => {
    const loadChurchSettings = async () => {
      try {
        const response = await fetch(apiUrl('/api/church-settings'));
        if (response.ok) {
          const settings = await response.json();
          if (settings.logo_url && !logoUrl) {
            // Se existe logo no banco mas não no localStorage, sincronizar
            const fullUrl = apiAssetUrl(settings.logo_url);
            setLogoUrl(fullUrl);
            console.log('✅ Logo sincronizado do banco:', fullUrl);
          }
        }
      } catch (error) {
        console.log('ℹ️ Configurações da igreja ainda não criadas');
      }
    };
    
    loadChurchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas na montagem do componente

  // ✅ CORRIGIDO: Filtro correto para membros ativos (case-insensitive)
  const activeMembers = members.filter(m => {
    const situacao = m.situacaoAtual?.toLowerCase() || m.status?.toLowerCase();
    return situacao === 'ativo';
  });

  // ✅ Todos os cálculos necessários estão aqui
  const stats = {
    totalMembros: members.length,
    ativos: activeMembers.length,
    desligados: members.length - activeMembers.length,
    homens: activeMembers.filter(m => {
      const sexo = m.sexo?.toLowerCase();
      return sexo === 'm' || sexo === 'masculino';
    }).length,
    mulheres: activeMembers.filter(m => {
      const sexo = m.sexo?.toLowerCase();
      return sexo === 'f' || sexo === 'feminino';
    }).length,
    batizados: activeMembers.filter(m => m.batizado).length, // ✅ Apenas membros ativos
  };
  const naoBatizados = stats.ativos - stats.batizados; // ✅ Apenas ativos

  const handleNameSave = () => {
    setChurchName(tempName);
    setIsEditingName(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    console.log('📸 Logo selecionada:', file.name);
    
    const formData = new FormData();
    formData.append('logo', file);
    
    try {
      console.log('🔄 Enviando logo para o servidor...');
      
      // Upload para /logos
      const uploadRes = await fetch(apiUrl('/api/upload-church-logo'), {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) {
        throw new Error(`Erro HTTP: ${uploadRes.status}`);
      }
      
      const uploadData = await uploadRes.json();
      console.log('✅ Logo enviada:', uploadData);
      
      if (uploadData.logo_url) {
        const fullUrl = apiAssetUrl(uploadData.logo_url);
        setLogoUrl(fullUrl);
        console.log('✅ Logo URL atualizada:', fullUrl);

        // Salvar no banco de dados church_settings
        try {
          const settingsRes = await fetch(apiUrl('/api/church-settings'));
          if (settingsRes.ok) {
            const settings = await settingsRes.json();
            
            // Atualizar com novo logo_url
            const updateRes = await fetch(apiUrl('/api/church-settings'), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...settings, logo_url: uploadData.logo_url })
            });
            
            if (updateRes.ok) {
              console.log('✅ Logo salva no banco de dados church_settings');
            }
          }
        } catch (dbError) {
          console.warn('⚠️ Logo salva localmente mas não no banco:', dbError);
        }
      }
    } catch (err) {
      console.error('❌ Erro ao fazer upload da logo:', err);
      // Fallback: usar FileReader para preview local
      const reader = new FileReader();
      reader.onload = (e) => setLogoUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="rounded-xl shadow-md p-4 bg-card">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        {/* Logo e Nome da Igreja */}
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative group flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-16 h-16 aspect-square rounded-full object-cover object-center border-2 border-primary" />
            ) : (
              <div className="w-16 h-16 aspect-square rounded-full bg-muted border-2 border-border flex items-center justify-center">
                <Church className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <label htmlFor="logo-upload" className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Upload className="h-4 w-4 text-white" />
              <Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input value={tempName} onChange={(e) => setTempName(e.target.value)} className="text-2xl font-bold" onKeyDown={(e) => e.key === 'Enter' && handleNameSave()} />
                <Button size="icon" onClick={handleNameSave}><Check className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h1 className="break-words text-xl font-bold text-foreground sm:text-2xl">{churchName}</h1>
                <Button size="icon" variant="ghost" className="opacity-0 group-hover/title:opacity-100 transition-opacity" onClick={() => setIsEditingName(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Visão geral do corpo de membros</p>
          </div>
        </div>

        <div className="flex items-center gap-2 xl:justify-end">
          <ThemeToggle />
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:items-center xl:justify-end xl:gap-3">
          {/* Card de Batismo */}
          <Card className="col-span-2 min-w-0 sm:col-span-1 xl:min-w-[180px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status de Batismo</CardTitle>
              <Heart className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="p-4 pt-0 flex justify-around">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.batizados}</div>
                <p className="text-xs text-muted-foreground">Batizados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{naoBatizados}</div>
                <p className="text-xs text-muted-foreground">Não Batizados</p>
              </div>
            </CardContent>
          </Card>
        
          {/* Card de Gênero */}
          <Card className="col-span-2 min-w-0 sm:col-span-1 xl:min-w-[180px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gênero (Ativos)</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0 flex justify-around">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.homens}</div>
                <p className="text-xs text-muted-foreground">Homens</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{stats.mulheres}</div>
                <p className="text-xs text-muted-foreground">Mulheres</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="hidden border-l h-16 border-border mx-1 xl:block"></div>

          {/* Cards de Status */}
          <Card onClick={() => onCardClick(undefined)} className="min-w-0 cursor-pointer text-center transition-colors hover:bg-muted/50 xl:min-w-[120px]">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{stats.totalMembros}</div></CardContent>
          </Card>
          <Card onClick={() => onCardClick('ativo')} className="min-w-0 cursor-pointer text-center transition-colors hover:bg-muted/50 xl:min-w-[120px]">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-success">Ativos</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-success">{stats.ativos}</div></CardContent>
          </Card>
          <Card onClick={() => onCardClick('desligado')} className="min-w-0 cursor-pointer text-center transition-colors hover:bg-muted/50 xl:min-w-[120px]">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-destructive">Desligados</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-destructive">{stats.desligados}</div></CardContent>
          </Card>
        </div>
      </div>
    </Card>
  );
};