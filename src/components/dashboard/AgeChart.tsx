import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps, Cell, ReferenceLine, LabelList, Label } from 'recharts';
import { Member, AgeGroupData } from '@/types/member';
import { getAgeGroupChartData } from '@/utils/memberUtils';
import { TrendingUp, Maximize2, Minimize2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { AGE_RANGE_COLORS, AGE_RANGE_ICONS, AGE_RANGE_LABELS } from '@/constants/chartColors';
import { Button } from '@/components/ui/button';

// Componente customizado para labels coloridos no eixo X
const ColoredAxisTick = ({ x, y, payload }: any) => {
  const color = AGE_RANGE_COLORS[payload.value] || '#000';
  const icon = AGE_RANGE_ICONS[payload.value] || '';
  
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Fundo colorido */}
      <rect
        x={-35}
        y={0}
        width={70}
        height={28}
        fill={color}
        opacity={0.15}
        rx={6}
      />
      {/* Borda colorida */}
      <rect
        x={-35}
        y={0}
        width={70}
        height={28}
        fill="none"
        stroke={color}
        strokeWidth={2}
        rx={6}
      />
      {/* Emoji/Ícone */}
      <text
        x={0}
        y={12}
        textAnchor="middle"
        fontSize={14}
      >
        {icon}
      </text>
      {/* Texto */}
      <text
        x={0}
        y={24}
        textAnchor="middle"
        fill={color}
        fontSize={10}
        fontWeight={700}
      >
        {payload.value}
      </text>
    </g>
  );
};

interface AgeChartProps {
  members: Member[];
  onBarClick?: (faixaEtaria: string) => void;
}

export const AgeChart = ({ members, onBarClick }: AgeChartProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const data: AgeGroupData[] = getAgeGroupChartData(members);

  // Calcular média para linha de referência (atualizado 16/12/2025)
  const averageValue = useMemo(() => {
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.quantidade, 0);
    return Math.round(total / data.length);
  }, [data]);

  const handleClick = (data: AgeGroupData) => {
    if (onBarClick && data.faixaEtaria) {
      onBarClick(data.faixaEtaria);
    }
  };

  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value ?? 0;
      const total = members.length > 0 ? members.length : 1;
      const percentage = ((value / total) * 100).toFixed(1);
      const diffFromAvg = value - averageValue;
      const diffSign = diffFromAvg > 0 ? '+' : '';
      
      return (
        <div className="bg-card border-2 rounded-lg p-4 shadow-xl">
          <p className="font-semibold text-base mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-primary font-bold text-lg">{value} pessoas</p>
            <p className="text-sm text-muted-foreground">{percentage}% do total</p>
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-muted-foreground">
                Média: {averageValue} pessoas
              </p>
              <p className={`text-xs font-medium ${diffFromAvg >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {diffSign}{diffFromAvg} em relação à média
              </p>
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
            <TrendingUp className="h-5 w-5" />
            Distribuição por Faixa Etária (Ativos)
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
            <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="gradient0-2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AGE_RANGE_COLORS['0-2']} stopOpacity={1}/>
                  <stop offset="100%" stopColor={AGE_RANGE_COLORS['0-2']} stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="gradient3-5" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AGE_RANGE_COLORS['3-5']} stopOpacity={1}/>
                  <stop offset="100%" stopColor={AGE_RANGE_COLORS['3-5']} stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="gradient6-11" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AGE_RANGE_COLORS['6-11']} stopOpacity={1}/>
                  <stop offset="100%" stopColor={AGE_RANGE_COLORS['6-11']} stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="gradient12-17" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AGE_RANGE_COLORS['12-17']} stopOpacity={1}/>
                  <stop offset="100%" stopColor={AGE_RANGE_COLORS['12-17']} stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="gradient18-29" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AGE_RANGE_COLORS['18-29']} stopOpacity={1}/>
                  <stop offset="100%" stopColor={AGE_RANGE_COLORS['18-29']} stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="gradient30-44" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AGE_RANGE_COLORS['30-44']} stopOpacity={1}/>
                  <stop offset="100%" stopColor={AGE_RANGE_COLORS['30-44']} stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="gradient45-59" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AGE_RANGE_COLORS['45-59']} stopOpacity={1}/>
                  <stop offset="100%" stopColor={AGE_RANGE_COLORS['45-59']} stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="gradient60+" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AGE_RANGE_COLORS['60+']} stopOpacity={1}/>
                  <stop offset="100%" stopColor={AGE_RANGE_COLORS['60+']} stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="faixaEtaria" 
                tick={<ColoredAxisTick />}
                angle={0}
                height={70}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
              {/* Linha de referência da média */}
              <ReferenceLine 
                y={averageValue} 
                stroke="#94A3B8" 
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ 
                  value: `Média: ${averageValue}`, 
                  position: 'right',
                  fill: '#64748B',
                  fontSize: 12,
                  fontWeight: 600
                }}
              />
              <Bar
                dataKey="quantidade"
                radius={[8, 8, 0, 0]}
                onClick={handleClick}
                className="cursor-pointer"
              >
                {data.map((entry, index) => {
                  const gradientId = `gradient${entry.faixaEtaria}`;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#${gradientId})`}
                      className="hover:opacity-80 transition-opacity"
                    />
                  );
                })}
                {/* Rótulos dentro das barras */}
                <LabelList 
                  dataKey="quantidade" 
                  position="top" 
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    fill: '#1F2937'
                  }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legenda com cards clicáveis */}
        <div className="w-full flex justify-center mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2 w-full">
            {data.map((item, index) => {
              const color = AGE_RANGE_COLORS[item.faixaEtaria || ''];
              const icon = AGE_RANGE_ICONS[item.faixaEtaria || ''];
              const label = AGE_RANGE_LABELS[item.faixaEtaria || ''];
              const total = members.length > 0 ? members.length : 1;
              const percentage = ((item.quantidade / total) * 100).toFixed(0);
              return (
                <div
                  key={index}
                  className="relative text-center cursor-pointer hover:shadow-lg p-4 rounded-lg transition-all hover:scale-105 border-2 overflow-hidden group flex flex-col items-center justify-center w-full h-full"
                  onClick={() => handleClick(item)}
                  style={{
                    borderColor: color,
                    maxWidth: 140,
                    maxHeight: 140,
                    boxSizing: 'border-box',
                    background: color + '10',
                  }}
                >
                  {/* Fundo colorido com opacidade */}
                  <div 
                    className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                    style={{ backgroundColor: color }}
                  />
                  {/* Badge colorido superior */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: color }}
                  />
                  {/* Conteúdo */}
                  <div className="relative">
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-2xl font-bold mb-1" style={{ color }}>{item.quantidade}</div>
                    <div className="text-xs font-semibold mb-1" style={{ color }}>{item.faixaEtaria}</div>
                    <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
                    <div 
                      className="text-xs font-medium px-2 py-0.5 rounded-full inline-block"
                      style={{ backgroundColor: color, color: 'white' }}
                    >
                      {percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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