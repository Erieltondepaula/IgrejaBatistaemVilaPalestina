// Local do arquivo: src/components/dashboard/SummaryCards.tsx
// ✅ CÓDIGO CORRIGIDO - Removidos comentários inválidos das tags JSX

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AGE_RANGE_COLORS } from '@/constants/chartColors';

interface SummaryCardsProps {
  ageDistribution: Record<string, number>;
  onAgeGroupClick: (ageGroup: string) => void;
}

const ageGroupsConfig = [
  { title: 'Bebês', range: '0-2 anos', key: 'bebes', filter: '0-2' },
  { title: 'Primeira Infância', range: '3-5 anos', key: 'primeiraInfancia', filter: '3-5' },
  { title: 'Infância', range: '6-11 anos', key: 'infancia', filter: '6-11' },
  { title: 'Adolescência', range: '12-17 anos', key: 'adolescencia', filter: '12-17' },
  { title: 'Jovem Adulto', range: '18-29 anos', key: 'jovemAdulto', filter: '18-29' },
  { title: 'Adulto', range: '30-44 anos', key: 'adulto', filter: '30-44' },
  { title: 'Meia-idade', range: '45-59 anos', key: 'meiaIdade', filter: '45-59' },
  { title: 'Idoso', range: '60+ anos', key: 'idoso', filter: '60+' },
];

export const SummaryCards = ({ ageDistribution, onAgeGroupClick }: SummaryCardsProps) => {
  return (
    <div className="w-full flex justify-center mb-2">
      <div
        className="grid w-full grid-cols-2 justify-center gap-3 rounded-xl border border-border bg-card p-2 shadow-lg sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8"
        style={{ minWidth: 0 }}
      >
        {ageGroupsConfig.map(({ title, range, key, filter }) => (
          <Card
            key={title}
            className="hover:shadow-md hover:border-primary transition-all cursor-pointer flex flex-col items-center justify-center w-full h-full min-h-[70px]"
            style={{
              borderColor: AGE_RANGE_COLORS[filter],
              background: AGE_RANGE_COLORS[filter] + '15',
              boxSizing: 'border-box',
            }}
            onClick={() => onAgeGroupClick(filter)}
          >
            <CardHeader className="p-1 px-2 pb-0 flex flex-col items-center justify-center w-full space-y-0">
              <CardTitle className="text-xs font-bold text-center truncate w-full" style={{ color: AGE_RANGE_COLORS[filter] }}>
                {title}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-1 px-2 pt-0 flex flex-col items-center justify-center w-full">
              <div className="text-lg font-extrabold leading-tight" style={{ color: AGE_RANGE_COLORS[filter] }}>
                {ageDistribution[key] || 0}
              </div>
              <p className="text-[10px] font-semibold opacity-85 text-center truncate w-full" style={{ color: AGE_RANGE_COLORS[filter] }}>
                {range}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};