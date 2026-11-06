import { Member } from '@/types/member';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Crown, GraduationCap } from 'lucide-react';
import { calculateAge } from '@/utils/memberUtils';

interface QuickStatsProps {
  members: Member[];
}

export const QuickStats = ({ members }: QuickStatsProps) => {
  // **CORREÇÃO: Todos os cálculos agora são baseados apenas nos membros ativos**
  const activeMembers = members.filter(m => m.status === 'ativo');

  const totalMembers = members.length;
  const activeMembersCount = activeMembers.length;
  const inactiveMembersCount = totalMembers - activeMembersCount;

  const baptizedMembers = activeMembers.filter(m => m.batizado).length;
  const membersWithRole = activeMembers.filter(m => m.lider || m.professorEBQ).length;
  
  const men = activeMembers.filter(m => m.sexo === 'M').length;
  const women = activeMembers.filter(m => m.sexo === 'F').length;

  const infancia = activeMembers.filter(m => calculateAge(m.dataNascimento) <= 6).length;
  const criancas = activeMembers.filter(m => { const age = calculateAge(m.dataNascimento); return age >= 7 && age <= 10; }).length;
  const adolescentes = activeMembers.filter(m => { const age = calculateAge(m.dataNascimento); return age >= 11 && age <= 17; }).length;
  const jovens = activeMembers.filter(m => { const age = calculateAge(m.dataNascimento); return age >= 18 && age <= 35; }).length;
  const adultos = activeMembers.filter(m => { const age = calculateAge(m.dataNascimento); return age >= 36 && age <= 59; }).length;
  const idosos = activeMembers.filter(m => calculateAge(m.dataNascimento) >= 60).length;

  const baptizedPercentage = activeMembersCount > 0 ? Math.round((baptizedMembers / activeMembersCount) * 100) : 0;
  const activePercentage = totalMembers > 0 ? Math.round((activeMembersCount / totalMembers) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMembers}</div>
          <p className="text-xs text-muted-foreground">
            {activeMembersCount} ativos e {inactiveMembersCount} desligados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gênero (Ativos)</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeMembersCount}</div>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="text-xs"> 👨 {men} Homens </Badge>
            <Badge variant="outline" className="text-xs"> 👩 {women} Mulheres </Badge>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Batismos (Ativos)</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{baptizedPercentage}%</div>
          <div className="flex gap-2 mt-2">
            <Badge variant="default" className="text-xs bg-primary text-primary-foreground"> 🔵 {baptizedMembers} Batizados </Badge>
            <Badge variant="outline" className="text-xs"> ⚫ {activeMembersCount - baptizedMembers} Não Batizados </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Funções (Ativos)</CardTitle>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-accent">{membersWithRole}</div>
          <div className="flex gap-2 mt-2">
            <Badge variant="default" className="text-xs bg-accent text-accent-foreground"> 👑 {membersWithRole} Com Função </Badge>
            <Badge variant="outline" className="text-xs"> 👤 {activeMembersCount - membersWithRole} Sem Função </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Distribuição por Faixa Etária (Ativos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center"><div className="text-lg font-bold">{infancia}</div><div className="text-xs text-muted-foreground">Infância (0-6)</div></div>
            <div className="text-center"><div className="text-lg font-bold">{criancas}</div><div className="text-xs text-muted-foreground">Crianças (7-10)</div></div>
            <div className="text-center"><div className="text-lg font-bold">{adolescentes}</div><div className="text-xs text-muted-foreground">Adolescentes (11-17)</div></div>
            <div className="text-center"><div className="text-lg font-bold">{jovens}</div><div className="text-xs text-muted-foreground">Jovens (18-35)</div></div>
            <div className="text-center"><div className="text-lg font-bold">{adultos}</div><div className="text-xs text-muted-foreground">Adultos (36-59)</div></div>
            <div className="text-center"><div className="text-lg font-bold">{idosos}</div><div className="text-xs text-muted-foreground">Idosos (60+)</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};