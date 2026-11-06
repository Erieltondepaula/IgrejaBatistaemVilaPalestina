// Local do arquivo: src/components/dashboard/MemberFilters.tsx
// ✅ CÓDIGO FINAL E DEFINITIVO (SEM 'any' E COM TIPAGEM CORRETA)

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Member, MemberFilters as MemberFiltersType } from '@/types/member';
import { Search, RotateCcw, CheckSquare, Gift, CalendarDays, SlidersHorizontal } from 'lucide-react';

interface MemberFiltersProps {
  members: Member[];
  filters: MemberFiltersType;
  onFiltersChange: (filters: MemberFiltersType) => void;
  onApply?: () => void;
  onClear?: () => void;
}

export const MemberFilters = ({ members, filters, onFiltersChange, onApply, onClear }: MemberFiltersProps) => {
  const [dataInicial, setDataInicial] = useState(filters.aniversariantesPeriodo?.dataInicial || '');
  const [dataFinal, setDataFinal] = useState(filters.aniversariantesPeriodo?.dataFinal || '');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const uniqueBairros = Array.from(new Set(members.map(m => m.bairro).filter(Boolean))).sort();

  useEffect(() => {
    if (!filters.aniversariantesPeriodo) {
      setDataInicial('');
      setDataFinal('');
    }
  }, [filters.aniversariantesPeriodo]);

  // ✅ CORREÇÃO FINAL: Função genérica e segura que o TypeScript entende.
  const handleFilterChange = <K extends keyof MemberFiltersType>(
    key: K,
    value: MemberFiltersType[K]
  ) => {
    // Nunca remover faixaEtaria, sexo ou idadeRange ao aplicar outros filtros
    const newFilters = { ...filters };
    const isValueEmpty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

    if (isValueEmpty) {
      // Só remove se não for faixaEtaria, sexo ou idadeRange
      if (key !== 'faixaEtaria' && key !== 'sexo' && key !== 'idadeRange') {
        delete newFilters[key];
      } else {
        newFilters[key] = undefined;
      }
    } else {
      newFilters[key] = value;
    }
    onFiltersChange(newFilters);
  };
  
  // ✅ NOVA FUNÇÃO: Lida com a mudança no intervalo de idades
  const handleAgeRangeChange = (field: 'min' | 'max', value: string) => {
    const newRange = { ...filters.idadeRange, [field]: value };
    if (!newRange.min && !newRange.max) {
      handleFilterChange('idadeRange', undefined);
    } else {
      handleFilterChange('idadeRange', newRange);
    }
  };
  
  const handleTipoMembroChange = (tipo: string, checked: boolean) => {
    const currentTipos = filters.tipoMembro || [];
    const newTipos = checked ? [...currentTipos, tipo] : currentTipos.filter(t => t !== tipo);
    handleFilterChange('tipoMembro', newTipos);
  };
  
  // ✅ COLE ESTA NOVA FUNÇÃO NO LUGAR DA ANTIGA
const handleBirthdayFilterChange = (
  type: 'aniversariantesDoMes' | 'aniversariantesDoDia',
  isChecked: boolean
) => {
  const newFilters: MemberFiltersType = { ...filters };

  // Limpa todos os filtros de aniversário para evitar conflitos
  delete newFilters.aniversariantesPeriodo;
  delete newFilters.aniversariantesDoMes;
  delete newFilters.aniversariantesDoDia;

  // Se o checkbox foi marcado, aplica o filtro correspondente
  if (isChecked) {
    newFilters[type] = true;
  }

  onFiltersChange(newFilters);
};

  const handleSearchByPeriod = () => {
    if (dataInicial && dataFinal) {
      onFiltersChange({
        ...filters,
        aniversariantesDoMes: undefined,
        aniversariantesDoDia: undefined,
        aniversariantesPeriodo: { dataInicial, dataFinal },
      });
    }
  };

  const clearAllFilters = () => {
    if (onClear) onClear();
    else onFiltersChange({});
  };

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <CardTitle className="flex items-center gap-2"><Search /> Filtros</CardTitle>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
          <Button variant="outline" onClick={() => setIsFiltersOpen(open => !open)} size="sm" className="flex-1 md:hidden">
            <SlidersHorizontal className="mr-2 h-4 w-4" />{isFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
          </Button>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button onClick={onApply || (() => onFiltersChange(filters))} size="sm" className="flex-1 sm:flex-none">
              <Search className="mr-2 h-4 w-4" /> Aplicar filtros
            </Button>
            <Button variant="outline" onClick={clearAllFilters} size="sm" className={`${isFiltersOpen ? 'inline-flex' : 'hidden'} w-full sm:w-auto md:inline-flex`}>
              <RotateCcw className="h-4 w-4 mr-2" /> Limpar Tudo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={`${isFiltersOpen ? 'block' : 'hidden'} space-y-6 p-4 pt-0 sm:p-6 sm:pt-0 md:block`}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Input placeholder="Pesquisar por nome (vários: separe por vírgula)..." value={Array.isArray(filters.search) ? filters.search.join(', ') : (filters.search || '')} onChange={e => handleFilterChange('search', e.target.value || undefined)} className="md:col-span-2" />
          {/* ✅ Por padrão mostra apenas ATIVOS, usuário pode selecionar Desligados explicitamente */}
          <Select value={filters.statusGeral || 'all'} onValueChange={value => handleFilterChange('statusGeral', value === 'all' ? undefined : value as 'ativo' | 'desligado')}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Apenas Ativos</SelectItem><SelectItem value="ativo">Ativos</SelectItem><SelectItem value="desligado">Desligados</SelectItem></SelectContent>
          </Select>
          <Select value={filters.sexo || 'all'} onValueChange={value => handleFilterChange('sexo', value === 'all' ? undefined : value)}>
            <SelectTrigger><SelectValue placeholder="Sexo" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Ambos os Sexos</SelectItem><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent>
          </Select>
          <Select value={filters.bairro || 'all'} onValueChange={value => handleFilterChange('bairro', value === 'all' ? undefined : value)}>
            <SelectTrigger><SelectValue placeholder="Bairro" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os Bairros</SelectItem>{uniqueBairros.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          {/* ✅ ALTERADO: Dois campos para o intervalo de idade */}
          <div className="flex items-center gap-2">
            <Input type="number" placeholder="Idade Mín." value={filters.idadeRange?.min || ''} onChange={e => handleAgeRangeChange('min', e.target.value)} />
            <span className="text-muted-foreground">-</span>
            <Input type="number" placeholder="Idade Máx." value={filters.idadeRange?.max || ''} onChange={e => handleAgeRangeChange('max', e.target.value)} />
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <Label className="flex items-center gap-2 font-semibold"><CheckSquare />Filtrar por Tipo de Membro</Label>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {['membro', 'batizado_congregado', 'congregado'].map(tipo => (
              <div key={tipo} className="flex items-center space-x-2">
                <Checkbox id={tipo} checked={filters.tipoMembro?.includes(tipo) || false} onCheckedChange={checked => handleTipoMembroChange(tipo, !!checked)} />
                <Label htmlFor={tipo} className="capitalize">{tipo.replace('_', ' ')}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
           <Label className="flex items-center gap-2 font-semibold"><Gift />Filtrar por Aniversariantes</Label>
           <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end">
              <div className="flex items-center space-x-2 pt-5">
                {/* ✅ COLE ESTA LINHA NO LUGAR DA ANTIGA */}
<Checkbox id="aniversariantesDoMes" checked={!!filters.aniversariantesDoMes} onCheckedChange={checked => handleBirthdayFilterChange('aniversariantesDoMes', !!checked)} />
                <Label htmlFor="aniversariantesDoMes">Do Mês</Label>
              </div>
              <div className="flex items-center space-x-2 pt-5">
               {/* ✅ COLE ESTA LINHA NO LUGAR DO CHECKBOX "DE HOJE" */}
<Checkbox id="aniversariantesDoDia" checked={!!filters.aniversariantesDoDia} onCheckedChange={checked => handleBirthdayFilterChange('aniversariantesDoDia', !!checked)} />
                <Label htmlFor="aniversariantesDoDia">De Hoje</Label>
              </div>
              <div className="grid min-w-0 flex-grow grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="min-w-0"><Label htmlFor="dataInicial">Data Inicial</Label><Input className="w-full min-w-0" type="date" id="dataInicial" value={dataInicial} onChange={e => setDataInicial(e.target.value)} /></div>
                <div className="min-w-0"><Label htmlFor="dataFinal">Data Final</Label><Input className="w-full min-w-0" type="date" id="dataFinal" value={dataFinal} onChange={e => setDataFinal(e.target.value)} /></div>
                <Button onClick={handleSearchByPeriod} className="w-full md:w-auto"><CalendarDays className="h-4 w-4 md:mr-2"/> <span className="md:inline">Pesquisar Período</span></Button>
              </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
};