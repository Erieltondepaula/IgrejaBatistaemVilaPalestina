import { PDFDocument, rgb, StandardFonts, PDFImage } from 'pdf-lib';
import { apiAssetUrl } from '@/lib/api';

export interface CardData {
  nome: string;
  id: string;
  dataNascimento: string;
  status: string;
  statusCivil: string;
  batizado: string;
  funcao: string;
  observacoes: string;
  ordenao: string;
  avatar_url?: string;
  logo_url?: string;
  Igreja?: string;
}

/**
 * Gera uma carteirinha de membro em PDF (tamanho padrão ISO CR80: 86 x 54 mm)
 * @param member Dados completos do membro para a carteirinha
 * @returns Promise<Uint8Array> bytes do PDF
 */
export async function generateMemberCard(member: CardData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // Tamanho cartão de crédito: 86 x 54 mm em pontos (72 DPI)
  // 86 mm ≈ 244 pt | 54 mm ≈ 153 pt
  const cardWidth = 244;
  const cardHeight = 153;
  
  const page = pdfDoc.addPage([cardWidth, cardHeight]);
  
  // ==========================================
  // 1. PALETA DE CORES
  // ==========================================
  const blueBg = rgb(24/255, 0/255, 173/255);       // Azul institucional exato (#1800ad)
  const yellowStripe = rgb(255/255, 223/255, 8/255); // Faixa amarela exata (#ffdf08)
  const textBlue = rgb(0.23, 0.21, 0.46);     // Azul escuro (Título Principal)
  const grayBox = rgb(0.89, 0.89, 0.89);      // Cinza claro (fundo dos campos)
  const textLabel = rgb(0.15, 0.15, 0.15);    // Quase preto (Rótulos)
  const textValue = rgb(0.20, 0.20, 0.20);    // Cor dos dados
  const white = rgb(1, 1, 1);
  
  // ==========================================
  // 2. FONTES
  // ==========================================
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // ==========================================
  // 3. ESTRUTURA DO CABEÇALHO (Y calculado de baixo para cima)
  // ==========================================
  const headerHeight = 70;
  const headerY = cardHeight - headerHeight; // 153 - 70 = 83
  const stripeHeight = 4;
  const stripeY = headerY - stripeHeight;    // 83 - 4 = 79

  // Fundo branco base
  page.drawRectangle({ x: 0, y: 0, width: cardWidth, height: cardHeight, color: white });

  // Fundo Azul (Cabeçalho)
  page.drawRectangle({ x: 0, y: headerY, width: cardWidth, height: headerHeight, color: blueBg });
  
  // Faixa Amarela de separação
  page.drawRectangle({ x: 0, y: stripeY, width: cardWidth, height: stripeHeight, color: yellowStripe });
  
  // ==========================================
  // 4. ÁREA 1 E 2: LOGO DA CARTEIRINHA (SEM TEXTO)
  // ==========================================
  try {
    const logoUrl = `${window.location.origin}/logocarteirinha.png`;
    const response = await fetch(logoUrl);
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      let logoImage: PDFImage;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
        logoImage = await pdfDoc.embedJpg(buffer);
      } else if (contentType.includes('image/png')) {
        logoImage = await pdfDoc.embedPng(buffer);
      } else {
        logoImage = await pdfDoc.embedPng(buffer);
      }
      
      const logoW = 160; 
      const logoH = 50;
      const logoX = 10;
      const logoY = headerY + (headerHeight - logoH) / 2;
      
      page.drawImage(logoImage, { x: logoX, y: logoY, width: logoW, height: logoH });
    } else {
      console.warn('A imagem logocarteirinha.png não foi encontrada na pasta public.');
    }
  } catch (error) {
    console.warn('Erro ao processar logo da carteirinha:', error);
  }

  // ==========================================
  // 5. ÁREA 3: FOTOGRAFIA DO MEMBRO (Sobreposição)
  // ==========================================
  const avatarW = 54;
  const avatarH = 74;
  const avatarX = cardWidth - avatarW - 10; 
  const avatarY = 58; 

  // Fundo/Borda Branca da Foto
  page.drawRectangle({
    x: avatarX, y: avatarY, width: avatarW, height: avatarH,
    color: white, borderColor: grayBox, borderWidth: 1,
  });

  if (member.avatar_url) {
    try {
      const url = apiAssetUrl(member.avatar_url);
      const response = await fetch(url);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        let image: PDFImage;
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('png')) {
          image = await pdfDoc.embedPng(buffer);
        } else {
          image = await pdfDoc.embedJpg(buffer);
        }
        
        page.drawImage(image, {
          x: avatarX + 2, y: avatarY + 2, width: avatarW - 4, height: avatarH - 4,
        });
      }
    } catch (error) {
      console.warn('Erro ao carregar avatar:', error);
    }
  }

  // ==========================================
  // 6. TÍTULO CENTRALIZADO (Dinâmico conforme a ordenação)
  // ==========================================
  const titleText = (member.ordenao || 'MEMBRO').toUpperCase();
  let titleSize = 16;
  let titleWidth = helveticaBold.widthOfTextAtSize(titleText, titleSize);
  let titleX = (cardWidth - titleWidth) / 2;
  
  if (titleX + titleWidth > 175) {
    titleSize = 13; 
    titleWidth = helveticaBold.widthOfTextAtSize(titleText, titleSize);
    titleX = (cardWidth - titleWidth) / 2;
    if (titleX + titleWidth > 175) {
      titleX = 10;
    }
  }
  
  page.drawText(titleText, {
    x: titleX, y: 62, size: titleSize, font: helveticaBold, color: textBlue,
  });

  // ==========================================
  // 7. CORPO: DISTRIBUIÇÃO DOS CAMPOS (GRID PERFEITO)
  // ==========================================
  const fieldHeight = 11;
  
  // Função atualizada para auto-ajustar o tamanho da letra e não vazar do campo cinza
  const drawField = (label: string, value: string, x: number, y: number, w: number) => {
    // Label acima do campo
    page.drawText(label, { x, y: y + fieldHeight + 2, size: 6, font: helveticaBold, color: textLabel });
    
    // Caixa de fundo
    page.drawRectangle({ x, y, width: w, height: fieldHeight, color: grayBox });
    
    const safeValue = value || '';
    let currentSize = 7;
    let textWidth = helvetica.widthOfTextAtSize(safeValue, currentSize);
    
    // Auto-ajuste de fonte: diminui a fonte se a palavra for maior que a caixinha
    while (textWidth > (w - 4) && currentSize > 4) {
      currentSize -= 0.5;
      textWidth = helvetica.widthOfTextAtSize(safeValue, currentSize);
    }

    // Escreve o texto com a fonte auto-ajustada
    page.drawText(safeValue, { x: x + 2, y: y + 3, size: currentSize, font: helvetica, color: textValue });
  };

  // Parâmetros do Grid Matemático (Alinhamento perfeito)
  const col1_X = 10;
  const col1_W = 70;
  
  const col2_X = 85;
  const col2_W = 70;
  
  const col3_X = 160;
  const col3_W = 74; // Vai exatamente até a margem direita (160 + 74 = 234)

  // LINHA 1 (Y: 39)
  const row1Y = 39;
  // Nome ocupa Coluna 1 e 2
  drawField('Nome:', member.nome.toUpperCase(), col1_X, row1Y, col1_W + col2_W + 5);
  drawField('Data de Nascimento:', member.dataNascimento, col3_X, row1Y, col3_W);

  // LINHA 2 (Y: 21)
  const row2Y = 21;
  drawField('Status', member.status.toUpperCase(), col1_X, row2Y, col1_W);
  drawField('Situação Civil:', member.statusCivil || '', col2_X, row2Y, col2_W);
  drawField('Batismo:', member.batizado, col3_X, row2Y, col3_W);

  // LINHA 3 (Y: 3)
  const row3Y = 3;
  drawField('Função:', (member.funcao || '').toUpperCase(), col1_X, row3Y, col1_W);
  drawField('Observações:', member.observacoes || '', col2_X, row3Y, col2_W);
  drawField('Ordenação:', (member.ordenao || '').toUpperCase(), col3_X, row3Y, col3_W);
  
  return await pdfDoc.save();
}