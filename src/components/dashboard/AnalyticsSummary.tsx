// Local do arquivo: src/components/dashboard/AnalyticsSummary.tsx
// ✅ CARDS DE LÍDERES E PROFESSORES EBQ

import { Member } from '@/types/member';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Crown, GraduationCap, Users } from 'lucide-react';
import { calculateAge } from '@/utils/memberUtils';

interface AnalyticsSummaryProps {
  members: Member[];
  onFunctionClick: (func: 'lider' | 'professorEBQ') => void;
}

export const AnalyticsSummary = ({ members, onFunctionClick }: AnalyticsSummaryProps) => {
  const totalMembers = members.length;
  const ages = members
    .filter(member => member.dataNascimento && !Number.isNaN(Date.parse(member.dataNascimento)))
    .map(member => calculateAge(member.dataNascimento));
  const averageAge = ages.length > 0
    ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)
    : null;

  const stats = {
    totalLideres: members.filter(m => m.lider).length,
    totalProfessores: members.filter(m => m.professorEBQ).length,
  };

  const percentLideres = totalMembers > 0 ? ((stats.totalLideres / totalMembers) * 100).toFixed(0) : 0;
  const percentProfessores = totalMembers > 0 ? ((stats.totalProfessores / totalMembers) * 100).toFixed(0) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Membros ativos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalMembers}</div>
          <p className="mt-1 text-xs text-muted-foreground">base dos gráficos</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-sky-600">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4 text-sky-600" />Idade média
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{averageAge === null ? '—' : `${averageAge} anos`}</div>
          <p className="mt-1 text-xs text-muted-foreground">dos membros com nascimento informado</p>
        </CardContent>
      </Card>

      {/* Card Líderes */}
      <Card 
        className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-yellow-500"
        onClick={() => onFunctionClick('lider')}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-yellow-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="pb-3 relative">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Líderes
            </span>
            <Crown className="h-5 w-5 text-yellow-400" />
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.totalLideres}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {percentLideres}% do total
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                Clique p/ filtrar
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Professores EBQ */}
      <Card 
        className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-green-500"
        onClick={() => onFunctionClick('professorEBQ')}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="pb-3 relative">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-green-500" />
              Professores EBQ
            </span>
            <GraduationCap className="h-5 w-5 text-green-400" />
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-green-600">
                {stats.totalProfessores}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {percentProfessores}% do total
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                Clique p/ filtrar
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};