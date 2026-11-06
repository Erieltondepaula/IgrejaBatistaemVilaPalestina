// Sistema de cores profissional para gráficos e visualizações
// Criado em: 16/12/2025

export const CHART_COLORS = {
  // Cores primárias
  primary: {
    blue: '#2563EB',
    purple: '#7C3AED',
    indigo: '#4F46E5',
  },

  // Gênero
  gender: {
    male: '#3B82F6',      // Azul
    female: '#EC4899',    // Rosa
    maleGradient: ['#3B82F6', '#2563EB'],
    femaleGradient: ['#EC4899', '#DB2777'],
  },

  // Faixas etárias (Rainbow)
  age: {
    child: '#10B981',     // Verde - 0-12
    teen: '#3B82F6',      // Azul - 13-17
    young: '#F59E0B',     // Amarelo - 18-30
    adult: '#EF4444',     // Vermelho - 31-45
    middleAge: '#8B5CF6', // Roxo - 46-60
    senior: '#6366F1',    // Indigo - 61+
  },

  // Heat map (intensidade)
  heat: {
    veryLow: '#F3F4F6',   // Cinza muito claro
    low: '#E5E7EB',       // Cinza claro
    medium: '#FCD34D',    // Amarelo
    high: '#FB923C',      // Laranja
    veryHigh: '#DC2626',  // Vermelho
  },

  // Status e estados
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Backgrounds com gradiente
  gradients: {
    blue: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    pink: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
    yellow: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
    green: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    purple: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    indigo: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
  },
};

// Mapeamento de faixas etárias para cores
export const AGE_RANGE_COLORS: Record<string, string> = {
  '0-2': '#10B981',        // Verde - Bebês
  '3-5': '#1e3a8a',       // Azul marinho - Primeira infância
  '6-11': '#3B82F6',      // Azul - Infância
  '12-17': '#6366F1',     // Roxo - Adolescência
  '18-29': '#F59E0B',     // Amarelo - Jovem adulto
  '30-44': '#EF4444',     // Vermelho - Adulto
  '45-59': '#8B5CF6',     // Roxo escuro - Meia-idade
  '60+': '#6366F1',       // Indigo - Idoso
};

// Mapeamento de faixas etárias para ícones/emojis
export const AGE_RANGE_ICONS: Record<string, string> = {
  '0-2': '👶',        // Bebês
  '3-5': '🧒',        // Primeira infância
  '6-11': '🧒',       // Infância
  '12-17': '🧑',      // Adolescência
  '18-29': '🧑‍🎓',    // Jovem adulto
  '30-44': '🧑‍💼',    // Adulto
  '45-59': '🧓',      // Meia-idade
  '60+': '👴',        // Idoso
};

// Mapeamento de faixas etárias para labels descritivos
export const AGE_RANGE_LABELS: Record<string, string> = {
  '0-2': 'Bebês',
  '3-5': 'Primeira Infância',
  '6-11': 'Infância',
  '12-17': 'Adolescência',
  '18-29': 'Jovem Adulto',
  '30-44': 'Adulto',
  '45-59': 'Meia-idade',
  '60+': 'Idoso',
};

// Função para calcular cor de intensidade
export const getHeatColor = (value: number, max: number): string => {
  if (max === 0) return CHART_COLORS.heat.veryLow;
  const intensity = value / max;
  
  if (intensity >= 0.8) return CHART_COLORS.heat.veryHigh;
  if (intensity >= 0.6) return CHART_COLORS.heat.high;
  if (intensity >= 0.4) return CHART_COLORS.heat.medium;
  if (intensity >= 0.2) return CHART_COLORS.heat.low;
  return CHART_COLORS.heat.veryLow;
};

// Função para obter cor com opacidade
export const getColorWithOpacity = (color: string, opacity: number): string => {
  // Converte hex para rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
