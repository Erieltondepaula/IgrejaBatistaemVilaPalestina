// Local do arquivo: src/utils/pdfUtils.ts
// ✅ CÓDIGO CORRIGIDO COM O NOVO LAYOUT E TÍTULO DINÂMICO

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Member, MemberFilters } from '@/types/member';
import { calculateAge, getMemberType } from './memberUtils';
import { apiAssetUrl } from '@/lib/api';

const generateReportTitle = (filters: MemberFilters): string => {
  const descriptions: string[] = [];
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Relatórios de aniversariantes
  if (filters.aniversariantesDoDia) return "Relatório de Aniversariantes de Hoje";
  if (filters.aniversariantesDoMes) return "Relatório de Aniversariantes do Mês";
  if (filters.aniversariantesPeriodo?.dataInicial && filters.aniversariantesPeriodo?.dataFinal) {
    return `Relatório de Aniversariantes: ${formatDate(filters.aniversariantesPeriodo.dataInicial)} a ${formatDate(filters.aniversariantesPeriodo.dataFinal)}`;
  }

  // Relatório de desligados
  if (filters.statusGeral === 'desligado') {
    return "Relatório de Desligados";
  }

  // Relatório de membros batizados ativos
  if (filters.statusGeral === 'ativo' && filters.tipoMembro && filters.tipoMembro.length === 1 && filters.tipoMembro[0] === 'membro') {
    return "Relatório de Membros";
  }

  // Relatório de congregados ativos
  if (filters.statusGeral === 'ativo' && filters.tipoMembro && filters.tipoMembro.length === 1 && filters.tipoMembro[0] === 'congregado') {
    return "Relatório de Congregados";
  }


  // Relatório por faixa etária
  if (filters.faixaEtaria) {
    return `Relatório Faixa Etária de ${filters.faixaEtaria} anos`;
  }

  // Relatório por sexo
  if (filters.sexo) {
    return `Relatório de Membros (${filters.sexo === 'M' ? 'Masculino' : 'Feminino'})`;
  }

  // Relatório por idade mínima/máxima
  if (filters.idadeRange && (filters.idadeRange.min || filters.idadeRange.max)) {
    const { min, max } = filters.idadeRange;
    if (min && max) {
      return `Relatório de Membros (Idade: ${min} a ${max} anos)`;
    } else if (min) {
      return `Relatório de Membros (Idade: A partir de ${min} anos)`;
    } else if (max) {
      return `Relatório de Membros (Idade: Até ${max} anos)`;
    }
  }

  // Relatório geral (todos ativos, sem filtro de tipo)
  if ((!filters.statusGeral || filters.statusGeral === 'ativo') && (!filters.tipoMembro || filters.tipoMembro.length === 0)) {
    return "Relatório Geral de Membros";
  }

  // Relatório personalizado (outros filtros combinados)
  if (filters.statusGeral === 'ativo') {
    descriptions.push('Ativos');
  }
  if (filters.tipoMembro && filters.tipoMembro.length > 0) {
    const tipos = filters.tipoMembro.map(t => {
      switch (t) {
        case 'membro': return 'Membros';
        case 'batizado_congregado': return 'Batizados (Não Membros)';
        case 'congregado': return 'Congregados';
        default: return '';
      }
    }).join(', ');
    descriptions.push(tipos);
  }
  if (filters.faixaEtaria) {
    descriptions.push(`Faixa Etária: ${filters.faixaEtaria}`);
  }
  if (filters.idadeRange) {
    const { min, max } = filters.idadeRange;
    if (min && max) {
      descriptions.push(`Idade: ${min} a ${max} anos`);
    } else if (min) {
      descriptions.push(`Idade: A partir de ${min} anos`);
    } else if (max) {
      descriptions.push(`Idade: Até ${max} anos`);
    }
  }
  if (filters.sexo) {
    descriptions.push(`Sexo: ${filters.sexo === 'M' ? 'Masculino' : 'Feminino'}`);
  }
  if (filters.bairro) {
    descriptions.push(`Bairro: ${filters.bairro}`);
  }
  if (descriptions.length > 0) {
    return `Relatório de Membros (${descriptions.join(' | ')})`;
  }
  return "Relatório Geral de Membros";
};

// Função auxiliar para calcular próximo aniversário e dia da semana
const getNextBirthdayInfo = (dataNascimento: string): { daysUntil: number; weekday: string } => {
  try {
    const dateStr = dataNascimento.includes('T') ? dataNascimento.split('T')[0] : dataNascimento;
    const [year, month, day] = dateStr.split('-');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentYear = today.getFullYear();
    let nextBirthday = new Date(currentYear, parseInt(month) - 1, parseInt(day));
    
    // Se já passou este ano, pegar o próximo
    if (nextBirthday < today) {
      nextBirthday = new Date(currentYear + 1, parseInt(month) - 1, parseInt(day));
    }
    
    const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const weekday = weekdays[nextBirthday.getDay()];
    
    return { daysUntil, weekday };
  } catch (e) {
    return { daysUntil: 0, weekday: 'N/A' };
  }
};

// Função para gerar avatar com inicial como imagem base64
const generateAvatarImage = (initial: string): string => {
  const canvas = document.createElement('canvas');
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Criar gradiente azul (mesmo estilo da interface)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#60a5fa'); // from-blue-400
  gradient.addColorStop(1, '#2563eb'); // to-blue-600
  
  // Desenhar círculo com gradiente
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Adicionar texto (inicial)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial.toUpperCase(), size / 2, size / 2);
  
  return canvas.toDataURL('image/png');
};

const createCircularAvatarImage = (avatarUrl: string, initial: string): Promise<string> => {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const size = 96;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');

      if (!context) {
        resolve(generateAvatarImage(initial));
        return;
      }

      const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const x = (size - width) / 2;
      const y = (size - height) / 2;

      context.beginPath();
      context.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      context.closePath();
      context.clip();
      context.drawImage(image, x, y, width, height);

      context.beginPath();
      context.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2);
      context.closePath();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 3;
      context.stroke();

      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => resolve(generateAvatarImage(initial));
    image.src = avatarUrl;
  });
};

export const exportToPDF = async (
  members: Member[], 
  filters: MemberFilters = {},
  logoUrl?: string | null,
  churchName?: string | null,
  filename: string = 'relatorio-membros',
  showAge: boolean = true, // Nova opção para mostrar/ocultar idade
  showPhoto: boolean = true, // Nova opção para mostrar/ocultar fotos
  showBirthdayWeekday: boolean = true, // Nova opção para mostrar dia da semana do aniversário
  showType: boolean = true, // Nova opção para mostrar/ocultar tipo de membro
  showDisconnectionDetails: boolean = false
) => {
  const doc = new jsPDF();
  const titulo = generateReportTitle(filters);
  const totalText = `Total de Registros: ${members.length}`;
  const generatedDate = `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const logoHeight = 18;
  const logoWidth = 18;

  // ✅ CABEÇALHO COM LOGO E TÍTULO ALINHADOS
  
  // Adiciona o logo no canto superior esquerdo
  const logoXPosition = 10;
  const logoYPosition = 6;
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', logoXPosition, logoYPosition, logoWidth, logoHeight);
    } catch (e) {
      console.error("Erro ao adicionar o logo no PDF:", e);
    }
  }

  // Título com quebra automática de linha, alinhado verticalmente com o centro da logo
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  
  const titleX = 37; // Alinhado à direita do logo
  const maxTitleWidth = pageWidth - titleX - margin - 5;
  
  // Quebrar título em múltiplas linhas se necessário
  const titleLines = doc.splitTextToSize(titulo, maxTitleWidth);
  const lineHeight = 6;
  const totalTitleHeight = titleLines.length * lineHeight;
  const titleYStart = 15;
  
  titleLines.forEach((line: string, index: number) => {
    doc.text(line, titleX, titleYStart + (index * lineHeight));
  });
  
  // Mantém data e total em uma única linha logo abaixo do título
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const infoYPosition = 24;
  doc.text(`${generatedDate}    |    ${totalText}`, titleX, infoYPosition);

  // Tabela de dados
  const tableData = members.map(member => {
    // Formatar data corretamente
    let dataFormatada = 'N/A';
    if (member.dataNascimento) {
      try {
        // Se está no formato ISO (2022-01-02T03:00:00.000Z), extrair apenas a data
        const dateStr = member.dataNascimento.includes('T') 
          ? member.dataNascimento.split('T')[0] 
          : member.dataNascimento;
        
        const [year, month, day] = dateStr.split('-');
        dataFormatada = `${day}/${month}/${year}`;
      } catch (e) {
        console.error('Erro ao formatar data:', member.dataNascimento, e);
        dataFormatada = 'Inválida';
      }
    }
    
    const row = [
      (member.nomeCompleto || member.nome || 'N/A').toUpperCase(), // Nome em caixa alta
      dataFormatada,
    ];
    
    // Adiciona idade apenas se showAge for true
    if (showAge) {
      row.push(calculateAge(member.dataNascimento).toString());
    }
    
    // Adiciona próximo aniversário se showBirthdayWeekday for true
    if (showBirthdayWeekday && member.dataNascimento) {
      const { daysUntil, weekday } = getNextBirthdayInfo(member.dataNascimento);
      let birthdayText = '';
      if (daysUntil === 0) {
        birthdayText = 'hoje';
      } else if (daysUntil === 1) {
        birthdayText = 'amanhã';
      } else {
        birthdayText = `${weekday}, daqui ${daysUntil} dias`;
      }
      row.push(birthdayText);
    }
    
    // Adiciona tipo apenas se showType for true
    if (showType) {
      row.push(getMemberType(member));
    }

    if (showDisconnectionDetails) {
      const disconnectionDate = member.dataDesligamento
        ? new Date(member.dataDesligamento).toLocaleDateString('pt-BR')
        : 'N/A';
      row.push(member.motivoDesligamento || 'N/A', disconnectionDate);
    }
    
    return row;
  });

  const circularAvatars = await Promise.all(members.map(async member => {
    const initial = member.nome?.charAt(0) || '?';
    if (!member.avatar_url) return generateAvatarImage(initial);

    const avatarUrl = member.avatar_url.startsWith('http')
      ? member.avatar_url
      : apiAssetUrl(member.avatar_url);
    return createCircularAvatarImage(avatarUrl, initial);
  }));
  
  // Define colunas baseado nas opções
  const tableHeaders = ['Nome', 'Data Nascimento'];
  if (showAge) {
    tableHeaders.push('Idade');
  }
  if (showBirthdayWeekday) {
    tableHeaders.push('Próximo Aniversário');
  }
  if (showType) {
    tableHeaders.push('Tipo');
  }
  if (showDisconnectionDetails) {
    tableHeaders.push('Motivo Desligamento', 'Data Desligamento');
  }
  
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: infoYPosition + 6,
    styles: { 
      fontSize: 8.5,
      valign: 'middle',
      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      minCellHeight: 10
    },
    headStyles: {
      fillColor: [22, 115, 222],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      minCellHeight: 7,
      valign: 'middle'
    },
    margin: { left: margin, right: margin },
    columnStyles: showPhoto ? {
      0: { cellPadding: { top: 3, right: 2, bottom: 3, left: 22 } } // Espaço para avatar e respiro vertical
    } : {},
    didParseCell: (data) => {
      if (showPhoto && data.section === 'body') {
        data.cell.styles.minCellHeight = 23;
        data.cell.styles.valign = 'middle';
      }
    },
    // ✅ ADICIONAR FOTOS OU AVATARES COM INICIAIS NA COLUNA NOME
    didDrawCell: (data) => {
      // Apenas processa se showPhoto=true E é a coluna de nome E é o corpo da tabela
      if (!showPhoto || data.section !== 'body' || data.column.index !== 0) {
        return;
      }
      
      const member = members[data.row.index];
      if (!member) return;
      
      try {
        const imgSize = 16; // 16px de diâmetro
        const imgX = data.cell.x + 3; // 3px da borda esquerda
        const imgY = data.cell.y + (data.cell.height - imgSize) / 2; // Centralizado verticalmente
        
        const avatarBase64 = circularAvatars[data.row.index];
        if (avatarBase64) {
          doc.addImage(avatarBase64, 'PNG', imgX, imgY, imgSize, imgSize);
        }
      } catch (e) {
        // Erro silencioso - continua o PDF sem a foto/avatar
        console.warn('Não foi possível adicionar avatar no PDF:', e);
      }
    }
  });

  doc.save(`${filename}.pdf`);
};