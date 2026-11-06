import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX } from 'lucide-react';
import { Member } from '@/types/member';

interface StatsCardsProps {
  members: Member[];
  onCardClick?: (status?: 'ativo' | 'desligado') => void;
}

export const StatsCards = ({ members, onCardClick }: StatsCardsProps) => {
  // CORREÇÃO: Agora 'membros' considera todos os registros, não apenas os batizados.
  const stats = {
    totalMembros: members.length,
    ativos: members.filter(m => m.status === 'ativo').length,
    desligados: members.filter(m => m.status === 'desligado').length,
  };

  const cards = [
    {
      title: 'Total de Membros',
      value: stats.totalMembros,
      icon: Users,
      color: 'text-primary',
      status: undefined,
    },
    {
      title: 'Ativos',
      value: stats.ativos,
      icon: UserCheck,
      color: 'text-success',
      status: 'ativo' as 'ativo' | 'desligado', // Definindo o tipo explicitamente
    },
    {
      title: 'Desligados',
      value: stats.desligados,
      icon: UserX,
      color: 'text-muted-foreground',
      status: 'desligado' as 'ativo' | 'desligado', // Definindo o tipo explicitamente
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onCardClick?.(card.status)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};