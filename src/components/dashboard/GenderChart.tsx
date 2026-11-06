import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, TooltipProps } from 'recharts';
import { Member } from '@/types/member';
import { getGenderChartData } from '@/utils/memberUtils';
import { Users, Maximize2, Minimize2 } from 'lucide-react';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { CHART_COLORS } from '@/constants/chartColors';
import { Button } from '@/components/ui/button';

interface GenderChartProps {
  members: Member[];
  onSegmentClick?: (sexo: 'M' | 'F') => void;
}

interface GenderData {
  name: string;
  value: number;
  fill?: string;
}

export const GenderChart = ({ members, onSegmentClick }: GenderChartProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // ✅ CORRIGIDO: Filtro correto para membros ativos (situacaoAtual pode ser "Ativo" ou "ativo")
  const activeMembers = members.filter(m => {
    const situacao = m.situacaoAtual?.toLowerCase() || m.status?.toLowerCase();
    return situacao === 'ativo';
  });
  const data: GenderData[] = getGenderChartData(activeMembers);

  const COLORS = {
    Masculino: CHART_COLORS.gender.male,
    Feminino: CHART_COLORS.gender.female,
  };

  const handleClick = (data: GenderData) => {
    if (onSegmentClick) {
      const sexo = data.name === 'Masculino' ? 'M' : 'F';
      onSegmentClick(sexo);
    }
  };

  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const total = activeMembers.length > 0 ? activeMembers.length : 1;
      const percentage = ((item.value! / total) * 100).toFixed(1);
      const genero = item.name === 'Masculino' ? 'M' : 'F';
      // ✅ CORRIGIDO: Filtrar por sexo aceitando M/F ou Masculino/Feminino
      const membrosGenero = activeMembers.filter(m => {
        const sexo = m.sexo?.toLowerCase();
        return (genero === 'M' && (sexo === 'm' || sexo === 'masculino')) ||
               (genero === 'F' && (sexo === 'f' || sexo === 'feminino'));
      });
      
      // Calcular idade média
      const idadeMedia = membrosGenero.reduce((sum, m) => sum + (m.idade || 0), 0) / membrosGenero.length;
      
      // Contar por faixa etária
      const faixas = {
        '0-12': membrosGenero.filter(m => (m.idade || 0) <= 12).length,
        '13-17': membrosGenero.filter(m => (m.idade || 0) >= 13 && (m.idade || 0) <= 17).length,
        '18-30': membrosGenero.filter(m => (m.idade || 0) >= 18 && (m.idade || 0) <= 30).length,
        '31-45': membrosGenero.filter(m => (m.idade || 0) >= 31 && (m.idade || 0) <= 45).length,
        '46-60': membrosGenero.filter(m => (m.idade || 0) >= 46 && (m.idade || 0) <= 60).length,
        '61+': membrosGenero.filter(m => (m.idade || 0) >= 61).length,
      };

      return (
        <div className="bg-card border-2 rounded-lg p-4 shadow-xl min-w-[200px]">
          <p className="font-semibold text-base mb-2">{item.name}</p>
          <div className="space-y-2">
            <div className="border-b pb-2">
              <p className="text-primary font-bold text-lg">{item.value} pessoas</p>
              <p className="text-sm text-muted-foreground">{percentage}% do total</p>
            </div>
            <div className="border-b pb-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Idade média:</p>
              <p className="text-sm font-semibold">{idadeMedia.toFixed(1)} anos</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Por faixa etária:</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.entries(faixas).map(([faixa, count]) => (
                  count > 0 && (
                    <div key={faixa} className="flex justify-between">
                      <span className="text-muted-foreground">{faixa}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-muted-foreground italic">Clique para filtrar →</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const chartCard = (
    <Card className="w-full h-full max-w-5xl max-h-[90vh] bg-background m-0 p-0 overflow-auto flex flex-col shadow-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Distribuição por Sexo (Ativos)
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id="maleGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.gender.male} stopOpacity={1}/>
                  <stop offset="100%" stopColor={CHART_COLORS.gender.male} stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="femaleGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.gender.female} stopOpacity={1}/>
                  <stop offset="100%" stopColor={CHART_COLORS.gender.female} stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={80}
                outerRadius={130}
                paddingAngle={2}
                dataKey="value"
                onClick={(payload) => handleClick(payload)}
                className="cursor-pointer"
                label={({ name, value, percent }) => {
                  const percentage = (percent * 100).toFixed(0);
                  return `${name}: ${value} (${percentage}%)`;
                }}
                labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
              >
                {data.map((entry, index) => {
                  const gradientId = entry.name === 'Masculino' ? 'maleGradient' : 'femaleGradient';
                  return (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={`url(#${gradientId})`}
                      className="hover:opacity-90 transition-opacity cursor-pointer"
                      stroke="white"
                      strokeWidth={3}
                    />
                  );
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                formatter={(value, entry: any) => {
                  const total = activeMembers.length;
                  const itemValue = entry.payload.value;
                  const percentage = ((itemValue / total) * 100).toFixed(0);
                  return `${value} (${percentage}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Cards de resumo abaixo do gráfico */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          {data.map((item) => {
            const total = activeMembers.length > 0 ? activeMembers.length : 1;
            const percentage = ((item.value / total) * 100).toFixed(1);
            const color = COLORS[item.name as keyof typeof COLORS];
            const genero = item.name === 'Masculino' ? 'M' : 'F';
            // ✅ CORRIGIDO: Filtrar por sexo aceitando M/F ou Masculino/Feminino
            const membrosGenero = activeMembers.filter(m => {
              const sexo = m.sexo?.toLowerCase();
              return (genero === 'M' && (sexo === 'm' || sexo === 'masculino')) ||
                     (genero === 'F' && (sexo === 'f' || sexo === 'feminino'));
            });
            const idadeMedia = membrosGenero.reduce((sum, m) => sum + (m.idade || 0), 0) / membrosGenero.length;
            
            return (
              <div
                key={item.name}
                className="text-center cursor-pointer hover:shadow-md p-4 rounded-lg transition-all border-2 hover:scale-105"
                onClick={() => handleClick(item)}
                style={{ borderColor: color }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <div className="text-sm font-medium text-muted-foreground">
                    {item.name}
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color }}>
                  {item.value}
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {percentage}% do total
                </div>
                <div className="text-xs text-muted-foreground border-t pt-2">
                  Idade média: <span className="font-semibold">{idadeMedia.toFixed(1)} anos</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  if (isFullscreen) {
    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
        {chartCard}
      </div>,
      document.body
    );
  }
  return chartCard;
};