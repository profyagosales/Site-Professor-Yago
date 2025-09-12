const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
// Usando importação dinâmica para node-fetch v3
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const CATEGORY_NAMES = {
    orange: "Aspectos Formais",
    green: "Ortografia/Gramática",
    yellow: "Argumentação e Estrutura",
    red: "Comentário Geral",
    blue: "Coesão e Coerência",
};

// Cores para as categorias
const COLORS = {
  orange: rgb(1, 0.6, 0), // Laranja
  green: rgb(0.1, 0.8, 0.1), // Verde
  yellow: rgb(1, 0.9, 0.1), // Amarelo
  red: rgb(0.9, 0.1, 0.1), // Vermelho
  blue: rgb(0.2, 0.5, 1), // Azul
};

// Gerar PDF corrigido com anotações e espelho
exports.generateCorrectedPdf = async (originalPdfUrl, correctionData) => {
  try {
    const { 
        studentName, 
        essayType, 
        finalGrade, 
        generalComments, 
        enemScores, 
        pasScores, 
        annotations 
    } = correctionData;

    // Baixar o PDF original
    const pdfBytes = await fetch(originalPdfUrl).then(res => res.arrayBuffer());
    
    // Carregar o PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Processar anotações
    if (annotations && annotations.length > 0) {
      const annotationsByPage = {};
      
      annotations.forEach(ann => {
        const pageNum = ann.position.pageNumber;
        if (!annotationsByPage[pageNum]) {
          annotationsByPage[pageNum] = [];
        }
        annotationsByPage[pageNum].push(ann);
      });
      
      for (const [pageNum, pageAnnotations] of Object.entries(annotationsByPage)) {
        const page = pdfDoc.getPages()[parseInt(pageNum) - 1];
        if (!page) continue;
        
        pageAnnotations.forEach((ann) => {
          const color = COLORS[ann.category] || rgb(0.5, 0.5, 0.5);
          
          ann.position.rects.forEach(rect => {
            page.drawRectangle({
              x: rect.x,
              y: page.getHeight() - rect.y - rect.height, // Ajuste de coordenada Y
              width: rect.width,
              height: rect.height,
              color,
              opacity: 0.3,
            });
          });
        });
      }
    }
    
    // Adicionar página de espelho
    let espelhoPage = pdfDoc.addPage();
    const { width, height } = espelhoPage.getSize();
    let yPosition = height - 40;

    const drawText = (text, options) => {
        const { font: textFont = font, size = 11, x = 50, y = yPosition, color = rgb(0,0,0), maxWidth = width - 100, lineHeight = 15 } = options;
        const words = text.split(' ');
        let line = '';
        for(const word of words) {
            const testLine = line + word + ' ';
            const testWidth = textFont.widthOfTextAtSize(testLine, size);
            if (testWidth > maxWidth) {
                espelhoPage.drawText(line, { x, y: yPosition, size, font: textFont, color });
                yPosition -= lineHeight;
                line = word + ' ';
            } else {
                line = testLine;
            }
        }
        espelhoPage.drawText(line, { x, y: yPosition, size, font: textFont, color });
        yPosition -= lineHeight;
    };

    const drawTitle = (text, size = 18) => {
        espelhoPage.drawText(text, {
            x: 50,
            y: yPosition,
            size,
            font: boldFont,
            color: rgb(0, 0, 0),
        });
        yPosition -= size * 1.8;
    };
    
    drawTitle('ESPELHO DE CORREÇÃO');
    
    drawText(`Aluno(a): ${studentName || 'N/A'}`, { y: yPosition, size: 12 });
    drawText(`Modelo: ${essayType}`, { y: yPosition, size: 12 });
    yPosition -= 20;

    if (annotations && annotations.length > 0) {
        drawTitle('Comentários e Anotações', 14);

        annotations.forEach((ann, index) => {
            if (yPosition < 80) {
                espelhoPage = pdfDoc.addPage();
                yPosition = height - 40;
            }
            const color = COLORS[ann.category] || rgb(0.5, 0.5, 0.5);
            const categoryName = CATEGORY_NAMES[ann.category] || "Outros";

            espelhoPage.drawRectangle({ x: 50, y: yPosition + 2, width: 10, height: 10, color });
            
            espelhoPage.drawText(`${index + 1}. [${categoryName}]`, { x: 65, y: yPosition, size: 10, font: boldFont });
            yPosition -= 15;
            drawText(`Trecho: "${ann.text}"`, { x: 65, size: 9, color: rgb(0.3, 0.3, 0.3) });
            drawText(`Comentário: ${ann.comment}`, { x: 65, size: 10 });
            yPosition -= 10;
        });
        yPosition -= 20;
    }

    if (generalComments) {
        if (yPosition < 100) {
            espelhoPage = pdfDoc.addPage();
            yPosition = height - 40;
        }
        drawTitle('Comentários Gerais', 14);
        drawText(generalComments, { size: 11, lineHeight: 15 });
        yPosition -= 20;
    }

    if (yPosition < 250) {
        espelhoPage = pdfDoc.addPage();
        yPosition = height - 40;
    }
    drawTitle('Detalhamento da Nota', 14);

    if (essayType === 'ENEM' && enemScores) {
        const scores = [
            `Competência 1: ${enemScores.c1 || 0}/200`,
            `Competência 2: ${enemScores.c2 || 0}/200`,
            `Competência 3: ${enemScores.c3 || 0}/200`,
            `Competência 4: ${enemScores.c4 || 0}/200`,
            `Competência 5: ${enemScores.c5 || 0}/200`,
        ];
        scores.forEach(score => drawText(score, { size: 11 }));
    } else if (essayType && essayType.startsWith('PAS') && pasScores) {
        const scores = [
            `Argumentação (x2): ${pasScores.arg || 0}`,
            `Tipo Textual (x2): ${pasScores.type || 0}`,
            `Língua Portuguesa (x1): ${pasScores.lang || 0}`,
        ];
        scores.forEach(score => drawText(score, { size: 11 }));
    }
    yPosition -= 20;

    drawTitle('Nota Final', 16);
    espelhoPage.drawText(`${finalGrade || 0}`, { x: 50, y: yPosition, size: 22, font: boldFont });

    const correctedPdfBytes = await pdfDoc.save();
    
    return correctedPdfBytes;
  } catch (error) {
    console.error('Erro ao gerar PDF corrigido:', error);
    throw error;
  }
};
