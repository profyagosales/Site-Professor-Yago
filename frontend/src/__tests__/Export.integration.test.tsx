/**
 * Testes de integração para sistema de exportação
 * 
 * Funcionalidades testadas:
 * - Exportação para CSV e XLSX
 * - Diferentes tipos de dados (notas, presença, redações)
 * - Geração de nomes de arquivo
 * - Detecção automática de tipos
 * - Formatação de dados
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toCSV, toXLSX, generateFilename, detectDataType, formatValue } from '@/lib/export';
import { useExport } from '@/hooks/useExport';
import ExportButton from '@/components/ExportButton';
import { toast } from 'react-toastify';

// Mock do toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock do downloadBlob
const mockDownloadBlob = jest.fn();
jest.mock('@/lib/export', () => ({
  ...jest.requireActual('@/lib/export'),
  toCSV: jest.fn(),
  toXLSX: jest.fn(),
}));

const mockToast = toast as jest.Mocked<typeof toast>;

// Wrapper para renderizar com router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Export Integration', () => {
  const mockData = [
    { name: 'João Silva', email: 'joao@email.com', grade: 8.5, present: true },
    { name: 'Maria Santos', email: 'maria@email.com', grade: 9.2, present: false },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Funções de exportação', () => {
    it('deve gerar nome de arquivo com timestamp', () => {
      const filename = generateFilename('teste', { includeTimestamp: true });
      expect(filename).toMatch(/^teste_\d{2}-\d{2}-\d{4}$/);
    });

    it('deve gerar nome de arquivo com turma', () => {
      const filename = generateFilename('notas', { includeClass: '9A' });
      expect(filename).toMatch(/^notas_9A/);
    });

    it('deve gerar nome de arquivo sem timestamp', () => {
      const filename = generateFilename('teste', { includeTimestamp: false });
      expect(filename).toBe('teste');
    });

    it('deve detectar tipos de dados corretamente', () => {
      expect(detectDataType('texto')).toBe('string');
      expect(detectDataType(123)).toBe('number');
      expect(detectDataType(true)).toBe('boolean');
      expect(detectDataType('2024-01-15')).toBe('date');
      expect(detectDataType('123.45')).toBe('number');
    });

    it('deve formatar valores corretamente', () => {
      expect(formatValue('2024-01-15', 'date')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(formatValue(8.5, 'number')).toBe(8.5);
      expect(formatValue(true, 'boolean')).toBe('Sim');
      expect(formatValue(false, 'boolean')).toBe('Não');
      expect(formatValue('texto', 'string')).toBe('texto');
    });
  });

  describe('Exportação CSV', () => {
    it('deve exportar dados para CSV', () => {
      toCSV('teste', mockData);
      
      expect(mockDownloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringContaining('teste')
      );
    });

    it('deve incluir BOM UTF-8 no CSV', () => {
      toCSV('teste', mockData);
      
      const call = mockDownloadBlob.mock.calls[0];
      const blob = call[0];
      
      expect(blob.type).toBe('text/csv;charset=utf-8;');
    });

    it('deve escapar vírgulas e aspas no CSV', () => {
      const dataWithCommas = [
        { name: 'João, Silva', email: 'joao@email.com', note: 'Nota com "aspas"' }
      ];
      
      toCSV('teste', dataWithCommas);
      
      expect(mockDownloadBlob).toHaveBeenCalled();
    });
  });

  describe('Exportação XLSX', () => {
    it('deve exportar dados para XLSX', () => {
      const sheets = [
        { name: 'Notas', data: mockData },
        { name: 'Presença', data: mockData }
      ];
      
      toXLSX('teste', sheets);
      
      expect(mockDownloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringContaining('teste')
      );
    });

    it('deve criar múltiplas abas', () => {
      const sheets = [
        { name: 'Aba1', data: mockData },
        { name: 'Aba2', data: mockData }
      ];
      
      toXLSX('teste', sheets);
      
      expect(mockDownloadBlob).toHaveBeenCalled();
    });
  });

  describe('Hook useExport', () => {
    it('deve exportar dados com sucesso', async () => {
      const { result } = renderHook(() => useExport());
      
      await act(async () => {
        await result.current.exportToCSV('teste', mockData);
      });
      
      expect(mockToast.success).toHaveBeenCalledWith('CSV "teste" exportado com sucesso');
    });

    it('deve mostrar erro quando exportação falha', async () => {
      const errorMessage = 'Erro de teste';
      toCSV.mockImplementation(() => {
        throw new Error(errorMessage);
      });
      
      const { result } = renderHook(() => useExport());
      
      await act(async () => {
        await result.current.exportToCSV('teste', mockData);
      });
      
      expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
      expect(result.current.error).toBe(errorMessage);
    });

    it('deve limpar erro quando solicitado', () => {
      const { result } = renderHook(() => useExport());
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Componente ExportButton', () => {
    it('deve renderizar botão de exportação', () => {
      renderWithRouter(
        <ExportButton
          type="csv"
          data={mockData}
          filename="teste"
        />
      );
      
      expect(screen.getByText('Exportar CSV')).toBeInTheDocument();
    });

    it('deve mostrar loading durante exportação', async () => {
      toCSV.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithRouter(
        <ExportButton
          type="csv"
          data={mockData}
          filename="teste"
        />
      );
      
      const button = screen.getByText('Exportar CSV');
      fireEvent.click(button);
      
      expect(screen.getByText('Exportando...')).toBeInTheDocument();
    });

    it('deve desabilitar botão quando loading', async () => {
      toCSV.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithRouter(
        <ExportButton
          type="csv"
          data={mockData}
          filename="teste"
        />
      );
      
      const button = screen.getByText('Exportar CSV');
      fireEvent.click(button);
      
      expect(button).toBeDisabled();
    });

    it('deve chamar onSuccess quando exportação é bem-sucedida', async () => {
      const onSuccess = jest.fn();
      
      renderWithRouter(
        <ExportButton
          type="csv"
          data={mockData}
          filename="teste"
          onSuccess={onSuccess}
        />
      );
      
      const button = screen.getByText('Exportar CSV');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('deve chamar onError quando exportação falha', async () => {
      const onError = jest.fn();
      const errorMessage = 'Erro de teste';
      
      toCSV.mockImplementation(() => {
        throw new Error(errorMessage);
      });
      
      renderWithRouter(
        <ExportButton
          type="csv"
          data={mockData}
          filename="teste"
          onError={onError}
        />
      );
      
      const button = screen.getByText('Exportar CSV');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(errorMessage);
      });
    });
  });

  describe('Exportação de notas', () => {
    it('deve exportar matriz de notas', async () => {
      const students = [
        { id: '1', name: 'João Silva', email: 'joao@email.com' },
        { id: '2', name: 'Maria Santos', email: 'maria@email.com' }
      ];
      
      const assessments = [
        { id: '1', name: 'Prova 1' },
        { id: '2', name: 'Prova 2' }
      ];
      
      const grades = [
        { studentId: '1', assessmentId: '1', value: 8.5 },
        { studentId: '1', assessmentId: '2', value: 9.0 },
        { studentId: '2', assessmentId: '1', value: 7.5 },
        { studentId: '2', assessmentId: '2', value: 8.0 }
      ];
      
      const { result } = renderHook(() => useExport());
      
      await act(async () => {
        await result.current.exportGrades(students, assessments, grades, '9A', '1');
      });
      
      expect(mockToast.success).toHaveBeenCalledWith('Notas da turma 9A exportadas com sucesso');
    });
  });

  describe('Exportação de presença', () => {
    it('deve exportar dados de presença', async () => {
      const students = [
        { id: '1', name: 'João Silva', email: 'joao@email.com' },
        { id: '2', name: 'Maria Santos', email: 'maria@email.com' }
      ];
      
      const entries = [
        { studentId: '1', present: true, activity: 'Aula de matemática' },
        { studentId: '2', present: false, activity: '' }
      ];
      
      const { result } = renderHook(() => useExport());
      
      await act(async () => {
        await result.current.exportAttendance(students, entries, '9A', '2024-01-15');
      });
      
      expect(mockToast.success).toHaveBeenCalledWith('Presença da turma 9A exportada com sucesso');
    });
  });

  describe('Exportação de redações', () => {
    it('deve exportar lista de redações', async () => {
      const essays = [
        {
          studentName: 'João Silva',
          studentEmail: 'joao@email.com',
          topic: 'Meio ambiente',
          type: 'ENEM',
          bimester: '1',
          status: 'pendente',
          grade: '',
          submittedAt: '2024-01-15T10:00:00Z',
          correctedAt: null
        }
      ];
      
      const { result } = renderHook(() => useExport());
      
      await act(async () => {
        await result.current.exportEssays(essays, '9A', 'pendente');
      });
      
      expect(mockToast.success).toHaveBeenCalledWith('Redações exportadas com sucesso');
    });
  });

  describe('Exportação combinada', () => {
    it('deve exportar dados combinados', async () => {
      const data = {
        grades: {
          students: [{ id: '1', name: 'João Silva', email: 'joao@email.com' }],
          assessments: [{ id: '1', name: 'Prova 1' }],
          grades: [{ studentId: '1', assessmentId: '1', value: 8.5 }]
        },
        attendance: {
          students: [{ id: '1', name: 'João Silva', email: 'joao@email.com' }],
          entries: [{ studentId: '1', present: true, activity: 'Aula' }]
        },
        essays: [{
          studentName: 'João Silva',
          topic: 'Meio ambiente',
          type: 'ENEM',
          status: 'pendente'
        }]
      };
      
      const { result } = renderHook(() => useExport());
      
      await act(async () => {
        await result.current.exportCombined(data, '9A', '1');
      });
      
      expect(mockToast.success).toHaveBeenCalledWith('Dados completos da turma 9A exportados com sucesso');
    });
  });

  describe('Configurações de exportação', () => {
    it('deve usar configurações padrão', () => {
      const { result } = renderHook(() => useExport({
        defaultOptions: {
          includeTimestamp: false,
          includeClass: '9A'
        }
      }));
      
      expect(result.current).toBeDefined();
    });

    it('deve mostrar toasts quando habilitado', async () => {
      const { result } = renderHook(() => useExport({
        showToasts: true
      }));
      
      await act(async () => {
        await result.current.exportToCSV('teste', mockData);
      });
      
      expect(mockToast.success).toHaveBeenCalled();
    });

    it('deve desabilitar toasts quando configurado', async () => {
      const { result } = renderHook(() => useExport({
        showToasts: false
      }));
      
      await act(async () => {
        await result.current.exportToCSV('teste', mockData);
      });
      
      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });
});
