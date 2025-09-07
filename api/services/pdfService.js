const { PDFDocument, rgb } = require('pdf-lib');
// Usando importação dinâmica para node-fetch, que funciona tanto em CommonJS quanto em ESM
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Cores para as categorias
const COLORS = {
  orange: rgb(1, 0.5, 0), // Laranja - Aspectos formais
  green: rgb(0, 0.8, 0.2), // Verde - Ortografia/gramática
  yellow: rgb(1, 1, 0), // Amarelo - Argumentação e estrutura
  red: rgb(1, 0, 0), // Vermelho - Comentário geral
  blue: rgb(0, 0.4, 1), // Azul - Coesão e coerência
};

// Gerar PDF corrigido com anotações e espelho
exports.generateCorrectedPdf = async (originalPdfUrl, annotations, espelho) => {
  try {
    // Baixar o PDF original
    const pdfBytes = await fetch(originalPdfUrl).then(res => res.arrayBuffer());
    
    // Carregar o PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Processar anotações
    if (annotations && annotations.highlights && annotations.highlights.length > 0) {
      // Organizar anotações por página
      const annotationsByPage = {};
      
      annotations.highlights.forEach(highlight => {
        if (!annotationsByPage[highlight.page]) {
          annotationsByPage[highlight.page] = [];
        }
        annotationsByPage[highlight.page].push(highlight);
      });
      
      // Adicionar anotações a cada página
      for (const [pageNum, highlights] of Object.entries(annotationsByPage)) {
        const page = pdfDoc.getPages()[parseInt(pageNum) - 1]; // Páginas são base-0 no pdf-lib
        
        if (!page) continue;
        
        // Adicionar retângulos para cada highlight
        highlights.forEach((highlight, index) => {
          const color = COLORS[highlight.color] || rgb(0.5, 0.5, 0.5);
          
          // Adicionar retângulos semitranslúcidos para cada área destacada
          highlight.rects.forEach(rect => {
            page.drawRectangle({
              x: rect.x,
              y: rect.y,
              width: rect.w,
              height: rect.h,
              color: { ...color, a: 0.4 }, // Alpha 0.4 (60% de transparência)
              opacity: 0.4
            });
          });
          
          // Adicionar número de referência (índice + 1) próximo ao highlight
          if (highlight.rects.length > 0) {
            const firstRect = highlight.rects[0];
            page.drawText(`${index + 1}`, {
              x: firstRect.x + firstRect.w,
              y: firstRect.y,
              size: 8,
              color: rgb(0, 0, 0),
            });
          }
        });
      }
    }
    
    // Adicionar página de espelho
    const espelhoPage = pdfDoc.addPage();
    
    // Configurar tamanho da página
    const { width, height } = espelhoPage.getSize();
    
    // Título
    espelhoPage.drawText('ESPELHO DE CORREÇÃO', {
      x: 50,
      y: height - 50,
      size: 18,
      color: rgb(0, 0, 0),
    });
    
    // Adicionar anotações com números de referência
    if (annotations && annotations.highlights && annotations.highlights.length > 0) {
      let yPosition = height - 100;
      
      annotations.highlights.forEach((highlight, index) => {
        const color = COLORS[highlight.color] || rgb(0.5, 0.5, 0.5);
        
        // Retângulo colorido para a categoria
        espelhoPage.drawRectangle({
          x: 50,
          y: yPosition - 5,
          width: 15,
          height: 15,
          color
        });
        
        // Número de referência + comentário
        espelhoPage.drawText(`${index + 1}. ${highlight.comment}`, {
          x: 75,
          y: yPosition,
          size: 10,
          color: rgb(0, 0, 0),
          maxWidth: width - 100
        });
        
        yPosition -= 25;
        
        // Verificar se precisa de nova página para anotações
        if (yPosition < 50) {
          const newPage = pdfDoc.addPage();
          yPosition = newPage.getSize().height - 50;
        }
      });
    }
    
    // Adicionar informações de nota/espelho
    if (espelho) {
      let yPosition = height - 350;
      
      espelhoPage.drawText('NOTA FINAL', {
        x: 50,
        y: yPosition,
        size: 16,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 30;
      
      if (espelho.type === 'ENEM') {
        // Espelho ENEM
        espelhoPage.drawText(`Competência 1: ${espelho.c1}/200`, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        espelhoPage.drawText(`Competência 2: ${espelho.c2}/200`, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        espelhoPage.drawText(`Competência 3: ${espelho.c3}/200`, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        espelhoPage.drawText(`Competência 4: ${espelho.c4}/200`, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        espelhoPage.drawText(`Competência 5: ${espelho.c5}/200`, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 40;
        
        espelhoPage.drawText(`NOTA FINAL: ${espelho.rawScore}/1000`, {
          x: 50,
          y: yPosition,
          size: 14,
          color: rgb(0, 0, 0),
        });
      } else if (espelho.type === 'PAS') {
        // Espelho PAS
        espelhoPage.drawText(`NC (Nota Conteúdo): ${espelho.NC}`, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        espelhoPage.drawText(`NE (Erros): ${espelho.NE}`, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        espelhoPage.drawText(`NL (Linha): ${espelho.NL}`, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        yPosition -= 40;
        
        espelhoPage.drawText(`NOTA FINAL: NR = NC - 2*NE/NL = ${espelho.rawScore}`, {
          x: 50,
          y: yPosition,
          size: 14,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    // Se a redação foi anulada
    if (espelho && espelho.annulment && espelho.annulment.active) {
      let yPosition = height - 550;
      
      espelhoPage.drawText('REDAÇÃO ANULADA', {
        x: 50,
        y: yPosition,
        size: 16,
        color: rgb(1, 0, 0),
      });
      
      yPosition -= 30;
      
      if (espelho.annulment.reasons && espelho.annulment.reasons.length > 0) {
        espelhoPage.drawText('Motivos:', {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
        
        yPosition -= 20;
        
        espelho.annulment.reasons.forEach(reason => {
          espelhoPage.drawText(`- ${reason}`, {
            x: 60,
            y: yPosition,
            size: 10,
            color: rgb(0, 0, 0),
            maxWidth: width - 120
          });
          
          yPosition -= 15;
        });
      }
    }
    
    // Salvar PDF modificado
    const correctedPdfBytes = await pdfDoc.save();
    
    return correctedPdfBytes;
  } catch (error) {
    console.error('Erro ao gerar PDF corrigido:', error);
    throw error;
  }
};
