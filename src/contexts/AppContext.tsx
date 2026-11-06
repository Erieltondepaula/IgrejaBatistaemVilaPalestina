// Local do arquivo: src/contexts/AppContext.tsx
// ✅ CÓDIGO CORRIGIDO - Busca dados do PostgreSQL ao iniciar

import { createContext, useState, useEffect, ReactNode } from 'react';
import { Member, MemberFilters } from '@/types/member';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL, apiAssetUrl } from '@/lib/api';

const API_URL = `${API_BASE_URL}/members`;

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

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [filters, setFilters] = useState<MemberFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // ✅ Buscar dados do PostgreSQL ao iniciar
  useEffect(() => {
    // Limpa o cache ao carregar a aplicação para garantir dados atualizados
    localStorage.removeItem('church-members');
    
    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        console.log('🔄 [AppContext] Carregando membros do PostgreSQL...');
        const response = await fetch(API_URL);
        
        if (!response.ok) {
          throw new Error('Backend não disponível');
        }
        
        const data: any[] = await response.json();
        console.log('✅ [AppContext] Membros carregados:', data.length);
        
        // Mapear campos do banco para o formato do frontend
        const formattedData: Member[] = data.map((item) => ({
          id: item.id || '',
          nome: item.nome || '',
          nomeCompleto: item.nome_completo || '',
          avatar_url: item.avatar_url ? apiAssetUrl(item.avatar_url) : undefined,
          dataNascimento: item.data_nascimento || '',
          idade: item.idade || 0,
          mes: item.mes || '',
          sexo: item.sexo, // ✅ CORRIGIDO: Pega o valor diretamente do banco
          telefone: item.telefone || '',
          email: item.email || '',
          endereco: `${item.rua || ''}, ${item.numero || ''} - ${item.bairro || ''}`,
          rua: item.rua || '',
          numero: item.numero || '',
          bairro: item.bairro || '',
          cidade: item.cidade || '',
          estado: item.estado || '',
          cep: item.cep || '',
          status: item.situacao_atual === 'Ativo' ? 'ativo' : item.situacao_atual === 'Desligado' ? 'desligado' : 'ativo',
          statusCivil: item.status_civil || '',
          conjuge: item.conjuge || '',
          parentesco: item.parentesco || '',
          batizado: item.batizado === true || item.batizado === 'true' || item.batizado === 1,
          membro: item.membro === true || item.membro === 'true' || item.membro === 1,
          lider: item.lider === true || item.lider === 'true' || item.lider === 1,
          professorEBQ: item.e_professor_ebq === true || item.e_professor_ebq === 'true' || item.e_professor_ebq === 1,
          faixaEtaria: item.faixa_etaria || '',
          pequeno_grupo: item.pequeno_grupo === true || item.pequeno_grupo === 'true' || item.pequeno_grupo === 1,
          grupo: item.grupo || '',
          numero_domes: item.numerodomes || 0,
          observacoes: item.observacoes || '',
          createdAt: item.created_at || '',
          updatedAt: item.updated_at || '',
        }));
        
        setMembers(formattedData);
      } catch (error) {
        console.error('❌ [AppContext] Erro ao carregar membros:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const onFiltersChange = (newFilters: MemberFilters) => {
    setFilters(newFilters);
  };

  const onRefresh = async () => {
    setIsLoading(true);
    try {
      // Limpa o cache também ao recarregar manualmente
      localStorage.removeItem('church-members');
      const response = await fetch(API_URL);
      const data: any[] = await response.json();
      
      const formattedData: Member[] = data.map((item) => ({
        id: item.id || '',
        nome: item.nome || '',
        nomeCompleto: item.nome_completo || '',
        avatar_url: item.avatar_url ? apiAssetUrl(item.avatar_url) : undefined,
        dataNascimento: item.data_nascimento || '',
        idade: item.idade || 0,
        mes: item.mes || '',
        sexo: item.sexo, // ✅ CORRIGIDO: Pega o valor diretamente do banco
        telefone: item.telefone || '',
        email: item.email || '',
        endereco: `${item.rua || ''}, ${item.numero || ''} - ${item.bairro || ''}`,
        rua: item.rua || '',
        numero: item.numero || '',
        bairro: item.bairro || '',
        cidade: item.cidade || '',
        estado: item.estado || '',
        cep: item.cep || '',
        status: item.situacao_atual === 'Ativo' ? 'ativo' : item.situacao_atual === 'Desligado' ? 'desligado' : 'ativo',
        statusCivil: item.status_civil || '',
        conjuge: item.conjuge || '',
        parentesco: item.parentesco || '',
        batizado: item.batizado === true,
        membro: item.membro === true,
        lider: item.lider === true,
        professorEBQ: item.e_professor_ebq === true,
        faixaEtaria: item.faixa_etaria || '',
        pequeno_grupo: item.pequeno_grupo === true,
        grupo: item.grupo || '',
        numero_domes: item.numerodomes || 0,
        observacoes: item.observacoes || '',
        createdAt: item.created_at || '',
        updatedAt: item.updated_at || '',
      }));
      
      setMembers(formattedData);
      toast({ title: "Dados Recarregados", description: `${formattedData.length} membros carregados.` });
    } catch (error) {
      toast({ title: "Erro ao recarregar", description: "Não foi possível recarregar os dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const onMemberUpdate = async (updatedMember: Member): Promise<void> => {
    setMembers(prevMembers => 
      prevMembers.map(member => 
        member.id === updatedMember.id ? updatedMember : member
      )
    );
    toast({ title: "Membro atualizado com sucesso!" });
  };

  const onMemberDelete = (memberId: string) => {
    setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
  };

  const onImport = async (importedMembers: Partial<Member>[]): Promise<boolean> => {
    setIsLoading(true);
    try {
      const newMembers: Member[] = importedMembers.map((member, index) => ({
        ...member,
        id: member.id || `imported-${Date.now()}-${index}`,
        createdAt: member.createdAt || new Date().toISOString(),
        updatedAt: member.updatedAt || new Date().toISOString()
      })) as Member[];
      
      setMembers(prevMembers => [...prevMembers, ...newMembers]);
      toast({ title: "Membros adicionados com sucesso!", description: `${newMembers.length} membros importados` });
      return true;
    } catch (error) {
      toast({ title: 'Erro ao importar membros', description: String(error) });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const onReplaceAll = async (importedMembers: Partial<Member>[]): Promise<boolean> => {
    setIsLoading(true);
    try {
      const newMembers: Member[] = importedMembers.map((member, index) => ({
        id: member.id || `imported-${Date.now()}-${index}`,
        nome: member.nome || '',
        nomeCompleto: member.nomeCompleto,
        avatar_url: member.avatar_url,
        dataNascimento: member.dataNascimento || '',
        idade: member.idade || 0,
        mes: member.mes || '',
        sexo: member.sexo || 'M',
        telefone: member.telefone || '',
        email: member.email,
        endereco: member.endereco || '',
        rua: member.rua || '',
        numero: member.numero || '',
        bairro: member.bairro || '',
        cidade: member.cidade || '',
        estado: member.estado || '',
        cep: member.cep || '',
        status: member.status || 'ativo',
        statusCivil: member.statusCivil,
        conjuge: member.conjuge,
        parentesco: member.parentesco,
        batizado: member.batizado || false,
        membro: member.membro || false,
        lider: member.lider || false,
        professorEBQ: member.professorEBQ || false,
        faixaEtaria: member.faixaEtaria || '',
        pequeno_grupo: member.pequeno_grupo || false,
        grupo: member.grupo,
        numero_domes: member.numero_domes,
        dataBatismo: member.dataBatismo,
        dataMembresia: member.dataMembresia,
        dataDesligamento: member.dataDesligamento,
        observacoes: member.observacoes,
        createdAt: member.createdAt || new Date().toISOString(),
        updatedAt: member.updatedAt || new Date().toISOString()
      }));
      
      setMembers(newMembers);
      toast({ 
        title: "Base de dados substituída com sucesso!", 
        description: `${newMembers.length} membros carregados`
      });
      return true;
    } catch (error) {
      toast({ title: 'Erro ao substituir membros', description: String(error) });
      return false;
    } finally {
      setIsLoading(false);
    }
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