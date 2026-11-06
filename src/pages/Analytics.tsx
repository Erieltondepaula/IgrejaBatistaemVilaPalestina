// Local do arquivo: src/pages/Analytics.tsx
// ✅ MELHORADO COM ANIMAÇÕES CSS

import { useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { MemberFilters } from '@/types/member';
import { GenderChart } from '@/components/dashboard/GenderChart';
import { AgeChart } from '@/components/dashboard/AgeChart';
import { NeighborhoodMap } from '@/components/dashboard/NeighborhoodMap';
import { AnalyticsSummary } from '@/components/dashboard/AnalyticsSummary';
import { useAppContext } from '@/contexts/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

const Analytics = () => {
  const { members, onFiltersChange, isLoading, onRefresh } = useAppContext();
  const navigate = useNavigate();

  const activeMembers = useMemo(() => members.filter(m => m.status === 'ativo'), [members]);

  const handleChartClick = (key: keyof MemberFilters, value: string) => {
    onFiltersChange({ [key]: value, statusGeral: 'ativo' });
    navigate('/');
  };

  const handleFunctionClick = (func: 'lider' | 'professorEBQ') => {
    onFiltersChange({ [func]: true, statusGeral: 'ativo' });
    navigate('/');
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gráficos e Análises</h1>
          <p className="text-sm text-muted-foreground">
            {activeMembers.length} ativos de {members.length} cadastros
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar dados
        </Button>
      </header>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center" role="status">
          <p className="text-muted-foreground">Carregando dados dos membros...</p>
        </div>
      ) : members.length === 0 || activeMembers.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
            <h2 className="font-semibold">
              {members.length === 0 ? 'Nenhum dado carregado' : 'Nenhum membro ativo'}
            </h2>
            <p className="max-w-lg text-sm text-muted-foreground">
              {members.length === 0
                ? 'Não foi possível exibir as análises. Confira a conexão com o banco e tente atualizar.'
                : 'Os gráficos mostram membros ativos. Altere o status de um cadastro ou confira a lista de membros.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="animate-slideDown">
            <AnalyticsSummary members={activeMembers} onFunctionClick={handleFunctionClick} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="animate-slideRight" style={{ animationDelay: '0.1s' }}>
              <GenderChart members={activeMembers} onSegmentClick={(sexo) => handleChartClick('sexo', sexo as 'M' | 'F')} />
            </div>
            <div className="animate-slideLeft" style={{ animationDelay: '0.2s' }}>
              <AgeChart members={activeMembers} onBarClick={(faixa) => handleChartClick('faixaEtaria', faixa)} />
            </div>
          </div>

          <div className="animate-slideUp" style={{ animationDelay: '0.3s' }}>
            <NeighborhoodMap members={activeMembers} onNeighborhoodClick={(bairro) => handleChartClick('bairro', bairro)} />
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;