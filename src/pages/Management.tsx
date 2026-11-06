// Local do arquivo: src/pages/Management.tsx

import { useMemo, useRef, useState } from 'react';
import { filterMembers, calculateAge } from '@/utils/memberUtils';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { Button } from '@/components/ui/button';
import ActiveNoAvatarModal from '@/components/ActiveNoAvatarModal';
import { MemberFilters as MemberFiltersComponent } from '@/components/dashboard/MemberFilters';
import { MemberList } from '@/components/dashboard/MemberList';
import { ImportExport } from '@/components/dashboard/ImportExport';
import { useAppContext } from '@/contexts/useAppContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Member } from '@/types/member';

const Management = () => {
  const { members, filters, onFiltersChange, onImport, onReplaceAll, onMemberUpdate, onMemberDelete, onRefresh, isLoading } = useAppContext();
  const memberListRef = useRef<HTMLDivElement>(null);
  
  // ✅ ESTADO E LÓGICA DE ORDENAÇÃO MOVIDOS PARA CÁ
  const [sortField, setSortField] = useState<keyof Member | 'idade' | 'tipo' | null>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredMembers = useMemo(() => filterMembers(members, filters), [members, filters]);

  const sortedMembers = useMemo(() => {
    if (!sortField) return filteredMembers;
    return [...filteredMembers].sort((a, b) => {
      if (sortField === 'dataNascimento') {
        const parseDayMonth = (dateString?: string): { month: number, day: number } | null => {
          if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
          const parts = dateString.split('-');
          return { month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
        };
        const dateA = parseDayMonth(a.dataNascimento);
        const dateB = parseDayMonth(b.dataNascimento);
        if (!dateA) return 1;
        if (!dateB) return -1;
        if (dateA.month !== dateB.month) {
          return sortDirection === 'asc' ? dateA.month - dateB.month : dateB.month - dateA.month;
        }
        return sortDirection === 'asc' ? dateA.day - dateB.day : dateB.day - dateA.day;
      }
      let aValue: string | number;
      let bValue: string | number;
      if (sortField === 'idade') {
        aValue = calculateAge(a.dataNascimento);
        bValue = calculateAge(b.dataNascimento);
      } else {
        aValue = a[sortField as keyof Member] as string | number || '';
        bValue = b[sortField as keyof Member] as string | number || '';
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredMembers, sortField, sortDirection]);

  const handleSort = (field: keyof Member | 'idade' | 'tipo') => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
  };
  
  const ageDistribution = useMemo(() => {
    const distribution: Record<string, number> = { 
      'Infância': 0, 'Crianças': 0, 'Adolescentes': 0, 
      'Jovens': 0, 'Adultos': 0, 'Idosos': 0 
    };
    
    const activeMembers = members.filter(m => m.status === 'ativo');
    
    activeMembers.forEach(m => {
      const age = calculateAge(m.dataNascimento);
      if (age <= 6) distribution['Infância']++;
      else if (age <= 10) distribution['Crianças']++;
      else if (age <= 17) distribution['Adolescentes']++;
      else if (age <= 35) distribution['Jovens']++;
      else if (age <= 59) distribution['Adultos']++;
      else distribution['Idosos']++;
    });
    return distribution;
  }, [members]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleAgeGroupClick = (ageGroup: string) => {
    onFiltersChange({ faixaEtaria: ageGroup, statusGeral: 'ativo' });
    memberListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownloadActiveNoAvatarPdf = () => {
    // Abrir rota que retorna PDF
    // abrir modal em vez de abrir direto
    setModalOpen(true);
  };

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)} className="bg-primary">Análise: Ativos sem avatar</Button>
      </div>
      <SummaryCards ageDistribution={ageDistribution} onAgeGroupClick={handleAgeGroupClick} />
      <ActiveNoAvatarModal open={modalOpen} onOpenChange={setModalOpen} />
      <ImportExport 
        members={members} 
        // ✅ PASSA A LISTA JÁ ORDENADA PARA A EXPORTAÇÃO
        filteredMembers={sortedMembers}
        filters={filters}
        onImport={onImport} 
        onReplaceAll={onReplaceAll} 
      />
      <MemberFiltersComponent 
        members={members} 
        filters={filters} 
        onFiltersChange={onFiltersChange} 
      />
      <div ref={memberListRef}>
        <MemberList 
          // ✅ PASSA A LISTA JÁ ORDENADA PARA A TABELA
          members={sortedMembers}
          onMemberUpdate={onMemberUpdate}
          onMemberDelete={onMemberDelete}
          onRefresh={onRefresh}
          // ✅ PASSA AS PROPRIEDADES DE ORDENAÇÃO
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </div>
    </div>
  );
};

export default Management;