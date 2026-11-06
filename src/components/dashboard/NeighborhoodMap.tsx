import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Member } from '@/types/member';
import { getNeighborhoodData, normalizeNeighborhoodName } from '@/utils/memberUtils';
import { MapPin, Users, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import { getHeatColor } from '@/constants/chartColors';
import { Button } from '@/components/ui/button';

interface NeighborhoodMapProps {
  members: Member[];
  onNeighborhoodClick?: (bairro: string) => void;
}

interface NeighborhoodStats {
  bairro: string;
  quantidade: number;
  homens: number;
  mulheres: number;
  lideres: number;
  professores: number;
  faixasEtarias: Record<string, number>;
}

export const NeighborhoodMap = ({ members, onNeighborhoodClick }: NeighborhoodMapProps) => {
  const [expandedBairro, setExpandedBairro] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const neighborhoodData = getNeighborhoodData(members);
  const maxCount = neighborhoodData.length > 0 ? Math.max(...neighborhoodData.map(n => n.quantidade)) : 0;

  // Calcular estatísticas detalhadas por bairro
  const getNeighborhoodStats = (bairro: string): NeighborhoodStats => {
    const bairroKey = normalizeNeighborhoodName(bairro);
    const membrosBairro = members.filter(m =>
      normalizeNeighborhoodName(m.bairro || 'Não informado') === bairroKey && m.status === 'ativo'
    );
    
    const faixasEtarias: Record<string, number> = {
      '0-12': membrosBairro.filter(m => (m.idade || 0) <= 12).length,
      '13-17': membrosBairro.filter(m => (m.idade || 0) >= 13 && (m.idade || 0) <= 17).length,
      '18-30': membrosBairro.filter(m => (m.idade || 0) >= 18 && (m.idade || 0) <= 30).length,
      '31-45': membrosBairro.filter(m => (m.idade || 0) >= 31 && (m.idade || 0) <= 45).length,
      '46-60': membrosBairro.filter(m => (m.idade || 0) >= 46 && (m.idade || 0) <= 60).length,
      '61+': membrosBairro.filter(m => (m.idade || 0) >= 61).length,
    };

    return {
      bairro,
      quantidade: membrosBairro.length,
      homens: membrosBairro.filter(m => m.sexo === 'M').length,
      mulheres: membrosBairro.filter(m => m.sexo === 'F').length,
      lideres: membrosBairro.filter(m => m.lider).length,
      professores: membrosBairro.filter(m => m.professorEBQ).length,
      faixasEtarias,
    };
  };

  const toggleExpand = (bairro: string) => {
    setExpandedBairro(expandedBairro === bairro ? null : bairro);
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle className="flex items-center gap-2">
              Mapeamento por Bairro
            </CardTitle>
            <Badge variant="outline" className="ml-2">
              {neighborhoodData.length} bairros
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (<CardContent>
        <div className="space-y-3">
          {neighborhoodData.map((neighborhood) => {
            const stats = getNeighborhoodStats(neighborhood.bairro);
            const heatColor = getHeatColor(neighborhood.quantidade, maxCount);
            const isExpanded = expandedBairro === neighborhood.bairro;
            const totalMembers = members.filter(m => m.status === 'ativo').length;
            const percentage = totalMembers > 0 ? ((neighborhood.quantidade / totalMembers) * 100).toFixed(1) : 0;

            return (
              <div
                key={neighborhood.bairro}
                className="border rounded-lg overflow-hidden transition-all hover:shadow-md"
                style={{ borderLeftWidth: '4px', borderLeftColor: heatColor }}
              >
                {/* Cabeçalho do bairro */}
                <div
                  className="flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => toggleExpand(neighborhood.bairro)}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: heatColor }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">{neighborhood.bairro}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {neighborhood.quantidade} membros
                        </span>
                        <span>•</span>
                        <span>{percentage}% do total</span>
                        <span>•</span>
                        <span>👨 {stats.homens}</span>
                        <span>👩 {stats.mulheres}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNeighborhoodClick?.(neighborhood.bairro);
                      }}
                      className="px-3 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Ver Lista
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Detalhes expansíveis */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-muted/20 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                      {/* Distribuição por Faixa Etária */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Por Faixa Etária:</h4>
                        <div className="space-y-1">
                          {Object.entries(stats.faixasEtarias).map(([faixa, count]) => (
                            count > 0 && (
                              <div key={faixa} className="flex justify-between text-sm">
                                <span>{faixa}:</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            )
                          ))}
                        </div>
                      </div>

                      {/* Funções */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Funções:</h4>
                        <div className="space-y-2">
                          {stats.lideres > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-yellow-500">👑</span>
                              <span>{stats.lideres} Líder{stats.lideres > 1 ? 'es' : ''}</span>
                            </div>
                          )}
                          {stats.professores > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-green-500">🎓</span>
                              <span>{stats.professores} Professor{stats.professores > 1 ? 'es' : ''}</span>
                            </div>
                          )}
                          {stats.lideres === 0 && stats.professores === 0 && (
                            <p className="text-sm text-muted-foreground italic">Sem funções atribuídas</p>
                          )}
                        </div>
                      </div>

                      {/* Resumo */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Resumo:</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Total Homens:</span>
                            <span className="font-medium text-blue-600">{stats.homens}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Total Mulheres:</span>
                            <span className="font-medium text-pink-600">{stats.mulheres}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t">
                            <span className="font-semibold">Total Geral:</span>
                            <span className="font-bold">{stats.quantidade}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legenda de intensidade */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-6 pt-4 border-t">
          <span className="font-medium">Intensidade:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(maxCount * 0.15, maxCount) }}></div>
            <span>Baixa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(maxCount * 0.4, maxCount) }}></div>
            <span>Média</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(maxCount * 0.7, maxCount) }}></div>
            <span>Alta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(maxCount, maxCount) }}></div>
            <span>Muito Alta</span>
          </div>
        </div>
      </CardContent>)}
    </Card>
  );
};
