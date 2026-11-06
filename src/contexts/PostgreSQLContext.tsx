// 🐘 CONTEXTO POSTGRESQL COM IDs PERSONALIZADOS
// Sistema otimizado com geração automática de IDs AA20253010104302

import { useState, useCallback, ReactNode, useEffect } from 'react';
import { AppContext } from './AppContext';
import { useToast } from "@/components/ui/use-toast";
import { Member, MemberFilters } from '@/types/member';
import { API_BASE_URL, apiAssetUrl } from '@/lib/api';

export interface AppContextType {
  members: Member[];
  filters: MemberFilters;
  isLoading: boolean;
  onFiltersChange: (filters: MemberFilters) => void;
  onImport: (members: Partial<Member>[]) => Promise<boolean>;
  onReplaceAll: (members: Partial<Member>[]) => Promise<boolean>;
  onMemberUpdate: (member: Member) => Promise<void>;
  onMemberDelete: (memberId: string) => void;
  onRefresh: () => void;
}

// AppContext agora está em AppContext.tsx

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [filters, setFilters] = useState<MemberFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Função para carregar dados do PostgreSQL
  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/members`);
      if (response.ok) {
        const data = await response.json();
        
        // Converter situacaoAtual para status e construir URL completa do avatar
        const membersWithStatus = data.map((member: any) => ({
          ...member,
          status: member.situacaoAtual === 'Ativo' ? 'ativo' : 'desligado',
          avatar_url: member.avatarUrl ? apiAssetUrl(member.avatarUrl) : undefined
        }));
        
        setMembers(membersWithStatus);
        console.log('✅ Dados carregados do PostgreSQL:', data.length, 'membros');
      } else {
        const errorText = await response.text();
        setMembers([]);
        console.error(`❌ Erro: API não disponível. Status: ${response.status}. Mensagem do servidor: ${errorText || 'Nenhuma.'}`);
      }
    } catch (error) {
      setMembers([]);
      console.error('❌ Erro ao conectar com PostgreSQL:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar dados ao inicializar
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const onFiltersChange = (newFilters: MemberFilters) => {
    setFilters(newFilters);
  };

  const onRefresh = () => {
    loadMembers();
    toast({ title: "Dados Recarregados", description: "A lista de membros foi recarregada do banco PostgreSQL." });
  };
  
  const onMemberUpdate = async (updatedMember: Member): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/members/${updatedMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedMember),
      });

      if (response.ok) {
        await loadMembers(); // Recarregar da API
        toast({ title: "Membro atualizado com sucesso no PostgreSQL!" });
      } else {
        throw new Error('Erro ao atualizar no servidor');
      }
    } catch (error) {
      console.log('⚠️ Erro ao atualizar no PostgreSQL, salvando localmente:', error);
      // Fallback para localStorage
      const updatedMembers = members.map(m => m.id === updatedMember.id ? updatedMember : m);
      setMembers(updatedMembers);
      localStorage.setItem('members-data', JSON.stringify(updatedMembers));
      toast({ title: "Membro atualizado localmente", description: "Não foi possível conectar ao banco PostgreSQL." });
    } finally {
      setIsLoading(false);
    }
  };

  const onMemberDelete = (memberId: string) => {
    setMembers((currentMembers) => currentMembers.filter((member) => member.id !== memberId));
  };

  const onImport = async (importedMembers: Partial<Member>[]): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // 🐘 Importar para PostgreSQL com IDs personalizados
      const response = await fetch(`${API_BASE_URL}/members/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members: importedMembers, replaceAll: true }),
      });

      if (response.ok) {
        await loadMembers(); // Recarregar da API
        toast({ title: "Planilha importada com sucesso! IDs personalizados gerados automaticamente." });
        return true;
      } else {
        throw new Error('Erro ao importar para o servidor');
      }
    } catch (error) {
      console.log('⚠️ Erro ao importar para PostgreSQL, salvando localmente:', error);
      // Fallback para localStorage
      const newMembers = importedMembers.map((m, index) => ({
        ...m,
        id: `member-${Date.now()}-${index}`,
      })) as Member[];
      
      setMembers(newMembers);
      localStorage.setItem('members-data', JSON.stringify(newMembers));
      toast({ 
        title: "Importação realizada localmente", 
        description: "Não foi possível conectar ao banco PostgreSQL. Dados salvos no navegador." 
      });
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const onReplaceAll = async (importedMembers: Partial<Member>[]): Promise<boolean> => {
    return onImport(importedMembers); // Mesma lógica da importação
  };

  const value = {
    members,
    filters,
    isLoading,
    onFiltersChange,
    onImport,
    onReplaceAll,
    onMemberUpdate,
    onMemberDelete,
    onRefresh
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};