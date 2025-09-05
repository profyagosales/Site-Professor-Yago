import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Tipos de exportação suportados
 */
export type ExportFormat = 'csv' | 'xlsx';

/**
 * Interface para dados de exportação
 */
export interface ExportData {
  [key: string]: any;
}

/**
 * Opções de exportação
 */
export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  includeHeaders?: boolean;
  encoding?: 'utf8' | 'utf8-bom';
}

/**
 * Classe utilitária para exportação de dados
 */
export class ExportUtils {
  /**
   * Exporta dados para CSV
   */
  static exportToCSV(
    data: ExportData[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = 'export.csv',
      includeHeaders = true,
      encoding = 'utf8-bom'
    } = options;

    const csvConfig: Papa.UnparseConfig = {
      header: includeHeaders,
      delimiter: ',',
      newline: '\n',
      quotes: true,
      quoteChar: '"',
      escapeChar: '"',
      skipEmptyLines: false
    };

    const csv = Papa.unparse(data, csvConfig);
    
    // Adicionar BOM para compatibilidade com Excel
    const bom = encoding === 'utf8-bom' ? '\uFEFF' : '';
    const csvWithBom = bom + csv;

    this.downloadFile(csvWithBom, filename, 'text/csv;charset=utf-8');
  }

  /**
   * Exporta dados para XLSX
   */
  static exportToXLSX(
    data: ExportData[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = 'export.xlsx',
      sheetName = 'Sheet1'
    } = options;

    // Criar workbook
    const workbook = XLSX.utils.book_new();
    
    // Converter dados para worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Gerar arquivo e fazer download
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Exporta dados para o formato especificado
   */
  static export(
    data: ExportData[],
    format: ExportFormat,
    options: ExportOptions = {}
  ): void {
    switch (format) {
      case 'csv':
        this.exportToCSV(data, options);
        break;
      case 'xlsx':
        this.exportToXLSX(data, options);
        break;
      default:
        throw new Error(`Formato de exportação não suportado: ${format}`);
    }
  }

  /**
   * Faz download de um arquivo
   */
  private static downloadFile(
    content: string,
    filename: string,
    mimeType: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar URL do objeto
    URL.revokeObjectURL(url);
  }

  /**
   * Gera nome de arquivo com timestamp
   */
  static generateFilename(prefix: string, format: ExportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `${prefix}_${timestamp}.${format}`;
  }

  /**
   * Valida dados antes da exportação
   */
  static validateData(data: ExportData[]): boolean {
    if (!Array.isArray(data)) {
      throw new Error('Dados devem ser um array');
    }
    
    if (data.length === 0) {
      throw new Error('Nenhum dado para exportar');
    }
    
    return true;
  }
}

/**
 * Funções específicas para exportação de notas
 */
export class GradesExport {
  /**
   * Exporta notas da classe
   */
  static exportClassGrades(
    grades: Array<{
      studentName: string;
      evaluationName: string;
      score: number | string;
      bimester: number | string;
    }>,
    format: ExportFormat = 'csv'
  ): void {
    ExportUtils.validateData(grades);
    
    const data = grades.map(grade => ({
      'Aluno': grade.studentName,
      'Avaliação': grade.evaluationName,
      'Nota': grade.score,
      'Bimestre': grade.bimester
    }));

    const filename = ExportUtils.generateFilename('notas_da_classe', format);
    
    ExportUtils.export(data, format, {
      filename,
      sheetName: 'Notas da Classe'
    });
  }
}

/**
 * Funções específicas para exportação de caderno
 */
export class NotebookExport {
  /**
   * Exporta diário da turma
   */
  static exportClassDiary(
    diary: Array<{
      date: string;
      content: string;
      studentAttendance: string;
      classAttendance: string;
    }>,
    format: ExportFormat = 'csv'
  ): void {
    ExportUtils.validateData(diary);
    
    const data = diary.map(entry => ({
      'Data': entry.date,
      'Conteúdo': entry.content,
      'Presença do Aluno': entry.studentAttendance,
      'Presença da Turma': entry.classAttendance
    }));

    const filename = ExportUtils.generateFilename('diario_da_turma', format);
    
    ExportUtils.export(data, format, {
      filename,
      sheetName: 'Diário da Turma'
    });
  }
}

/**
 * Funções específicas para exportação de redações
 */
export class EssaysExport {
  /**
   * Exporta lista de redações
   */
  static exportEssays(
    essays: Array<{
      studentName: string;
      topic: string;
      status: string;
      score: number | string;
      pdfUrl: string;
    }>,
    format: ExportFormat = 'csv'
  ): void {
    ExportUtils.validateData(essays);
    
    const data = essays.map(essay => ({
      'Aluno': essay.studentName,
      'Tema': essay.topic,
      'Status': essay.status,
      'Nota': essay.score,
      'Link do PDF': essay.pdfUrl
    }));

    const filename = ExportUtils.generateFilename('redacoes', format);
    
    ExportUtils.export(data, format, {
      filename,
      sheetName: 'Redações'
    });
  }
}

/**
 * Função utilitária para criar botão de exportação
 */
export function createExportButton(
  onExport: () => void,
  label: string = 'Exportar',
  className: string = 'ys-btn-primary'
): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = className;
  button.textContent = label;
  button.onclick = onExport;
  return button;
}

/**
 * Função para mostrar seletor de formato de exportação
 */
export function showExportFormatSelector(
  onFormatSelected: (format: ExportFormat) => void
): void {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 flex items-center justify-center bg-black/50 z-50';
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold mb-4">Escolher formato de exportação</h3>
      <div class="space-y-3">
        <button 
          class="w-full p-3 text-left border rounded hover:bg-gray-50 export-format-btn" 
          data-format="csv"
        >
          <div class="font-medium">CSV</div>
          <div class="text-sm text-gray-500">Compatível com Excel, Google Sheets</div>
        </button>
        <button 
          class="w-full p-3 text-left border rounded hover:bg-gray-50 export-format-btn" 
          data-format="xlsx"
        >
          <div class="font-medium">XLSX</div>
          <div class="text-sm text-gray-500">Formato nativo do Excel</div>
        </button>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button class="px-4 py-2 border rounded cancel-export">Cancelar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  modal.querySelectorAll('.export-format-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const format = (e.target as HTMLElement).closest('[data-format]')?.getAttribute('data-format') as ExportFormat;
      if (format) {
        onFormatSelected(format);
        document.body.removeChild(modal);
      }
    });
  });
  
  modal.querySelector('.cancel-export')?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

export default ExportUtils;
