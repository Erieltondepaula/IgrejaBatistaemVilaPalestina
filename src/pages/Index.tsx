import React, { useMemo, useRef, useState } from 'react';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { MemberFilters as MemberFiltersComponent } from '@/components/dashboard/MemberFilters';
import { MemberDirectory } from '@/components/dashboard/MemberDirectory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/useAppContext';
import { filterMembers, calculateAge, getAgeGroup } from '@/utils/memberUtils';
import { Download } from 'lucide-react';
import { APP_VERSION } from '@/constants/appVersion';
import { MemberFilters } from '@/types/member';

const Index = () => {
  const { members, filters, onFiltersChange, onMemberUpdate, onMemberDelete, onRefresh } = useAppContext();
  const memberListRef = useRef<HTMLDivElement>(null);
  const [draftFilters, setDraftFilters] = useState(filters);
  const [appliedFilters, setAppliedFilters] = useState<MemberFilters>({});
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);

  const filteredMembers = useMemo(
    () => filterMembers(members, hasAppliedFilters ? appliedFilters : {}),
    [appliedFilters, hasAppliedFilters, members]
  );

  const ageDistribution = useMemo(() => {
    const dist = {
      bebes: 0,
      primeiraInfancia: 0,
      infancia: 0,
      adolescencia: 0,
      jovemAdulto: 0,
      adulto: 0,
      meiaIdade: 0,
      idoso: 0
    };
    filteredMembers.forEach(m => {
      const group = getAgeGroup(calculateAge(m.dataNascimento));
      if (group === '0-2') dist.bebes++;
      else if (group === '3-5') dist.primeiraInfancia++;
      else if (group === '6-11') dist.infancia++;
      else if (group === '12-17') dist.adolescencia++;
      else if (group === '18-29') dist.jovemAdulto++;
      else if (group === '30-44') dist.adulto++;
      else if (group === '45-59') dist.meiaIdade++;
      else if (group === '60+') dist.idoso++;
    });
    return dist;
  }, [filteredMembers]);

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setHasAppliedFilters(true);
    onFiltersChange(draftFilters);
    memberListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleClearFilters = () => {
    setDraftFilters({});
    setAppliedFilters({});
    setHasAppliedFilters(false);
    onFiltersChange({});
  };

  const handleChartClick = (faixa: string) => {
    const isSame = appliedFilters.faixaEtaria === faixa;
    const newFilters = { ...appliedFilters, statusGeral: 'ativo' as const };
    if (isSame) {
      delete newFilters.faixaEtaria;
    } else {
      newFilters.faixaEtaria = faixa;
    }
    setDraftFilters(newFilters);
    setAppliedFilters(newFilters);
    setHasAppliedFilters(true);
    onFiltersChange(newFilters);
    memberListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto space-y-6 p-3 sm:p-6" style={{ pointerEvents: 'auto', opacity: 1 }}>
        <div className="my-3 w-full text-center sm:my-6">
          <h1 className="text-xl font-semibold text-white sm:text-2xl">
            <span className="sm:hidden">Filtros de membros</span>
            <span className="hidden sm:inline">Filtros e resultados de membros</span>
          </h1>
        </div>
        <div className="w-full mb-8 z-0">
          <SummaryCards ageDistribution={ageDistribution} onAgeGroupClick={handleChartClick} />
        </div>
        <Card className="border-primary/40 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4 sm:p-5">
            <Download className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base text-foreground">Teste de atualização pela rede</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Versão de validação {APP_VERSION}. Se este aviso aparecer na máquina secundária após atualizá-la, a interface chegou pela rede.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              v{APP_VERSION}
            </span>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 text-sm text-muted-foreground sm:px-5 sm:pb-5">
            <p>Esta versão exibe o marcador para confirmar que a interface foi atualizada pela rede.</p>
          </CardContent>
        </Card>
        <MemberFiltersComponent
          filters={draftFilters}
          onFiltersChange={setDraftFilters}
          members={members}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
        {hasAppliedFilters ? (
          <>
            <div className="text-sm font-medium text-muted-foreground" aria-live="polite">
              Resultados encontrados: {filteredMembers.length}
            </div>
            <div ref={memberListRef}>
              <MemberDirectory
                members={filteredMembers}
                onMemberUpdate={onMemberUpdate}
                onMemberDelete={onMemberDelete}
                onRefresh={onRefresh}
                filters={{
                  ...appliedFilters,
                  faixaEtaria: appliedFilters.faixaEtaria || undefined,
                  sexo: appliedFilters.sexo || undefined,
                  idadeRange: appliedFilters.idadeRange || undefined
                }}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground" role="status">
            Selecione os critérios desejados e clique em “Aplicar filtros” para ver os membros.
          </p>
        )}
      </div>
    </div>
  );
};

export default Index;
