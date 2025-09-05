/**
 * Utilitários para exportação de dados em CSV e XLSX
 * 
 * Funcionalidades:
 * - Exportação para CSV com encoding UTF-8
 * - Exportação para XLSX com múltiplas abas
 * - Detecção automática de tipos de dados
 * - Formatação de nomes de arquivo com data e turma
 * - Suporte a diferentes estruturas de dados
 */

import * as XLSX from 'xlsx';
import { logger } from './logger';

export interface ExportRow {
  [key: string]: any;
}

export interface ExportSheet {
  name: string;
  data: ExportRow[];
}

export interface ExportOptions {
  filename?: string;
  includeTimestamp?: boolean;
  includeClass?: string;
  dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY';
}

/**
 * Gera nome de arquivo com data e turma
 */
export function generateFilename(
  baseName: string, 
  options: ExportOptions = {}
): string {
  const {
    includeTimestamp = true,
    includeClass = '',
    dateFormat = 'DD-MM-YYYY'
  } = options;

  let filename = baseName;

  // Adiciona turma se fornecida
  if (includeClass) {
    filename += `_${includeClass.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  // Adiciona timestamp se solicitado
  if (includeTimestamp) {
    const now = new Date();
    let dateStr: string;

    switch (dateFormat) {
      case 'YYYY-MM-DD':
        dateStr = now.toISOString().split('T')[0];
        break;
      case 'DD/MM/YYYY':
        dateStr = now.toLocaleDateString('pt-BR');
        break;
      case 'DD-MM-YYYY':
      default:
        dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
        break;
    }

    filename += `_${dateStr}`;
  }

  return filename;
}

/**
 * Detecta tipo de dados automaticamente
 */
export function detectDataType(value: any): 'string' | 'number' | 'date' | 'boolean' {
  if (value === null || value === undefined) return 'string';
  
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  
  if (typeof value === 'string') {
    // Verifica se é data
    const dateRegex = /^\d{4}-\d{2}-\d{2}/;
    if (dateRegex.test(value)) return 'date';
    
    // Verifica se é número
    if (!isNaN(Number(value)) && value.trim() !== '') return 'number';
    
    return 'string';
  }
  
  return 'string';
}

/**
 * Formata valor para exibição
 */
export function formatValue(value: any, dataType: 'string' | 'number' | 'date' | 'boolean'): any {
  if (value === null || value === undefined) return '';
  
  switch (dataType) {
    case 'date':
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
      }
      return value instanceof Date ? value.toLocaleDateString('pt-BR') : value;
    
    case 'number':
      return typeof value === 'number' ? value : Number(value);
    
    case 'boolean':
      return value ? 'Sim' : 'Não';
    
    case 'string':
    default:
      return String(value);
  }
}

/**
 * Exporta dados para CSV
 */
export function toCSV(
  filename: string, 
  rows: ExportRow[], 
  options: ExportOptions = {}
): void {
  try {
    if (!rows || rows.length === 0) {
      throw new Error('Nenhum dado para exportar');
    }

    // Gera nome do arquivo
    const finalFilename = generateFilename(filename, options);
    
    // Obtém cabeçalhos
    const headers = Object.keys(rows[0]);
    
    // Detecta tipos de dados
    const dataTypes = headers.map(header => 
      detectDataType(rows[0][header])
    );
    
    // Prepara dados CSV
    const csvRows: string[] = [];
    
    // Adiciona cabeçalhos
    csvRows.push(headers.join(','));
    
    // Adiciona dados
    rows.forEach(row => {
      const values = headers.map((header, index) => {
        const value = row[header];
        const dataType = dataTypes[index];
        const formattedValue = formatValue(value, dataType);
        
        // Escapa vírgulas e aspas
        const stringValue = String(formattedValue);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      });
      
      csvRows.push(values.join(','));
    });
    
    // Cria blob com BOM para UTF-8
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Faz download
    downloadBlob(blob, `${finalFilename}.csv`);
    
    logger.info('CSV exportado com sucesso', {
      filename: finalFilename,
      rows: rows.length,
      headers: headers.length,
    });
    
  } catch (error) {
    logger.error('Erro ao exportar CSV', {
      filename,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Exporta dados para XLSX
 */
export function toXLSX(
  filename: string, 
  sheets: ExportSheet[], 
  options: ExportOptions = {}
): void {
  try {
    if (!sheets || sheets.length === 0) {
      throw new Error('Nenhuma planilha para exportar');
    }

    // Gera nome do arquivo
    const finalFilename = generateFilename(filename, options);
    
    // Cria workbook
    const workbook = XLSX.utils.book_new();
    
    // Processa cada planilha
    sheets.forEach(sheet => {
      if (!sheet.data || sheet.data.length === 0) {
        logger.warn('Planilha vazia ignorada', { sheetName: sheet.name });
        return;
      }
      
      // Obtém cabeçalhos
      const headers = Object.keys(sheet.data[0]);
      
      // Detecta tipos de dados
      const dataTypes = headers.map(header => 
        detectDataType(sheet.data[0][header])
      );
      
      // Prepara dados formatados
      const formattedData = sheet.data.map(row => {
        const formattedRow: any = {};
        headers.forEach((header, index) => {
          const value = row[header];
          const dataType = dataTypes[index];
          formattedRow[header] = formatValue(value, dataType);
        });
        return formattedRow;
      });
      
      // Cria worksheet
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Ajusta largura das colunas
      const colWidths = headers.map(header => ({
        wch: Math.max(header.length, 15)
      }));
      worksheet['!cols'] = colWidths;
      
      // Adiciona worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });
    
    // Gera arquivo XLSX
    const xlsxBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      compression: true
    });
    
    // Cria blob e faz download
    const blob = new Blob([xlsxBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    downloadBlob(blob, `${finalFilename}.xlsx`);
    
    logger.info('XLSX exportado com sucesso', {
      filename: finalFilename,
      sheets: sheets.length,
      totalRows: sheets.reduce((sum, sheet) => sum + sheet.data.length, 0),
    });
    
  } catch (error) {
    logger.error('Erro ao exportar XLSX', {
      filename,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Faz download de blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Utilitários específicos para diferentes tipos de dados
 */

/**
 * Exporta matriz de notas (alunos x avaliações)
 */
export function exportGradesMatrix(
  students: any[],
  assessments: any[],
  grades: any[],
  className: string,
  term: string
): void {
  const filename = `Notas_${className}_${term}Bimestre`;
  
  // Cria cabeçalhos
  const headers = ['Aluno', 'Email', ...assessments.map(a => a.name), 'Média'];
  
  // Cria dados
  const rows = students.map(student => {
    const row: any = {
      'Aluno': student.name,
      'Email': student.email,
    };
    
    // Adiciona notas de cada avaliação
    assessments.forEach(assessment => {
      const grade = grades.find(g => 
        g.studentId === student.id && g.assessmentId === assessment.id
      );
      row[assessment.name] = grade ? grade.value : '';
    });
    
    // Calcula média (simplificado)
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const validGrades = studentGrades.filter(g => g.value !== null && g.value !== undefined);
    const average = validGrades.length > 0 
      ? (validGrades.reduce((sum, g) => sum + Number(g.value), 0) / validGrades.length).toFixed(1)
      : '';
    
    row['Média'] = average;
    
    return row;
  });
  
  toCSV(filename, rows, { includeClass: className });
}

/**
 * Exporta presença do caderno
 */
export function exportAttendance(
  students: any[],
  entries: any[],
  className: string,
  date: string
): void {
  const filename = `Presenca_${className}_${date}`;
  
  const rows = students.map(student => {
    const entry = entries.find(e => e.studentId === student.id);
    
    return {
      'Aluno': student.name,
      'Email': student.email,
      'Presente': entry ? (entry.present ? 'Sim' : 'Não') : 'Não informado',
      'Atividade': entry ? entry.activity : '',
      'Data': date,
    };
  });
  
  toCSV(filename, rows, { includeClass: className });
}

/**
 * Exporta lista de redações
 */
export function exportEssays(
  essays: any[],
  className?: string,
  status?: string
): void {
  const filename = `Redacoes_${status || 'Todas'}`;
  
  const rows = essays.map(essay => ({
    'Aluno': essay.studentName || essay.student?.name || '',
    'Email': essay.studentEmail || essay.student?.email || '',
    'Tema': essay.topic || '',
    'Tipo': essay.type || '',
    'Bimestre': essay.bimester || '',
    'Status': essay.status || '',
    'Nota': essay.grade || '',
    'Data de Envio': essay.submittedAt ? new Date(essay.submittedAt).toLocaleDateString('pt-BR') : '',
    'Data de Correção': essay.correctedAt ? new Date(essay.correctedAt).toLocaleDateString('pt-BR') : '',
    'Turma': essay.className || className || '',
  }));
  
  toCSV(filename, rows, { includeClass: className });
}

/**
 * Exporta dados combinados (múltiplas abas)
 */
export function exportCombinedData(
  data: {
    grades?: { students: any[], assessments: any[], grades: any[] };
    attendance?: { students: any[], entries: any[] };
    essays?: any[];
  },
  className: string,
  term?: string
): void {
  const filename = `Dados_Completos_${className}`;
  const sheets: ExportSheet[] = [];
  
  // Aba de notas
  if (data.grades) {
    const { students, assessments, grades } = data.grades;
    const headers = ['Aluno', 'Email', ...assessments.map(a => a.name), 'Média'];
    
    const gradeRows = students.map(student => {
      const row: any = {
        'Aluno': student.name,
        'Email': student.email,
      };
      
      assessments.forEach(assessment => {
        const grade = grades.find(g => 
          g.studentId === student.id && g.assessmentId === assessment.id
        );
        row[assessment.name] = grade ? grade.value : '';
      });
      
      const studentGrades = grades.filter(g => g.studentId === student.id);
      const validGrades = studentGrades.filter(g => g.value !== null && g.value !== undefined);
      const average = validGrades.length > 0 
        ? (validGrades.reduce((sum, g) => sum + Number(g.value), 0) / validGrades.length).toFixed(1)
        : '';
      
      row['Média'] = average;
      return row;
    });
    
    sheets.push({
      name: `Notas_${term || ''}Bimestre`,
      data: gradeRows,
    });
  }
  
  // Aba de presença
  if (data.attendance) {
    const { students, entries } = data.attendance;
    
    const attendanceRows = students.map(student => {
      const entry = entries.find(e => e.studentId === student.id);
      
      return {
        'Aluno': student.name,
        'Email': student.email,
        'Presente': entry ? (entry.present ? 'Sim' : 'Não') : 'Não informado',
        'Atividade': entry ? entry.activity : '',
        'Data': new Date().toLocaleDateString('pt-BR'),
      };
    });
    
    sheets.push({
      name: 'Presenca',
      data: attendanceRows,
    });
  }
  
  // Aba de redações
  if (data.essays) {
    const essayRows = data.essays.map(essay => ({
      'Aluno': essay.studentName || essay.student?.name || '',
      'Email': essay.studentEmail || essay.student?.email || '',
      'Tema': essay.topic || '',
      'Tipo': essay.type || '',
      'Bimestre': essay.bimester || '',
      'Status': essay.status || '',
      'Nota': essay.grade || '',
      'Data de Envio': essay.submittedAt ? new Date(essay.submittedAt).toLocaleDateString('pt-BR') : '',
      'Data de Correção': essay.correctedAt ? new Date(essay.correctedAt).toLocaleDateString('pt-BR') : '',
    }));
    
    sheets.push({
      name: 'Redacoes',
      data: essayRows,
    });
  }
  
  toXLSX(filename, sheets, { includeClass: className });
}

export default {
  toCSV,
  toXLSX,
  generateFilename,
  detectDataType,
  formatValue,
  exportGradesMatrix,
  exportAttendance,
  exportEssays,
  exportCombinedData,
};
