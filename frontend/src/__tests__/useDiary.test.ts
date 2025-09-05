/**
 * Testes para o hook useDiary
 * 
 * Funcionalidades testadas:
 * - Carregamento de dados do diário
 * - Autosave com debounce de 1s
 * - Histórico de lançamentos
 * - Validação de dados
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useDiary } from '@/hooks/useDiary';
import { 
  getDiary, 
  saveDiaryDebounced,
  getDiaryHistory,
  getClassStudents,
  validateDiaryData,
  createDefaultDiaryData
} from '@/services/diary';
import { toast } from 'react-toastify';

// Mock dos serviços
jest.mock('@/services/diary', () => ({
  getDiary: jest.fn(),
  saveDiaryDebounced: jest.fn(),
  getDiaryHistory: jest.fn(),
  getClassStudents: jest.fn(),
  validateDiaryData: jest.fn(),
  createDefaultDiaryData: jest.fn(),
}));

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
  },
}));

const mockGetDiary = getDiary as jest.MockedFunction<typeof getDiary>;
const mockSaveDiaryDebounced = saveDiaryDebounced as jest.MockedFunction<typeof saveDiaryDebounced>;
const mockGetDiaryHistory = getDiaryHistory as jest.MockedFunction<typeof getDiaryHistory>;
const mockGetClassStudents = getClassStudents as jest.MockedFunction<typeof getClassStudents>;
const mockValidateDiaryData = validateDiaryData as jest.MockedFunction<typeof validateDiaryData>;
const mockCreateDefaultDiaryData = createDefaultDiaryData as jest.MockedFunction<typeof createDefaultDiaryData>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('useDiary', () => {
  const mockStudents = [
    { id: '1', name: 'João Silva', email: 'joao@email.com' },
    { id: '2', name: 'Maria Santos', email: 'maria@email.com' },
  ];

  const mockEntries = [
    { id: '1', studentId: '1', studentName: 'João Silva', isPresent: true, activity: 'Exercícios de matemática' },
    { id: '2', studentId: '2', studentName: 'Maria Santos', isPresent: false, activity: '' },
  ];

  const mockDiaryData = {
    id: 'diary-1',
    classId: 'class-1',
    date: '2024-01-15',
    entries: mockEntries,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  };

  const mockHistory = [
    {
      date: '2024-01-15',
      entriesCount: 2,
      presentCount: 1,
      absentCount: 1,
      hasActivities: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClassStudents.mockResolvedValue(mockStudents);
    mockValidateDiaryData.mockReturnValue({ isValid: true, errors: [] });
    mockCreateDefaultDiaryData.mockReturnValue({
      classId: 'class-1',
      date: '2024-01-15',
      entries: mockStudents.map(student => ({
        studentId: student.id,
        studentName: student.name,
        isPresent: true,
        activity: '',
      })),
    });
  });

  describe('Inicialização', () => {
    it('deve carregar dados do diário automaticamente', async () => {
      mockGetDiary.mockResolvedValue(mockDiaryData);

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.diaryData).toEqual(mockDiaryData);
      expect(result.current.students).toEqual(mockStudents);
      expect(result.current.entries).toEqual(mockEntries);
    });

    it('deve criar dados padrão se não existir', async () => {
      mockGetDiary.mockRejectedValue(new Error('Not found'));

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockCreateDefaultDiaryData).toHaveBeenCalledWith('class-1', '2024-01-15', mockStudents);
      expect(result.current.diaryData).toBeDefined();
    });

    it('não deve carregar se classId for vazio', () => {
      renderHook(() => useDiary({ classId: '', date: '2024-01-15' }));

      expect(mockGetDiary).not.toHaveBeenCalled();
    });
  });

  describe('Atualização de entradas', () => {
    it('deve atualizar entrada com sucesso', async () => {
      mockGetDiary.mockResolvedValue(mockDiaryData);

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateEntry('1', { isPresent: false });
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('deve fazer autosave após 1 segundo', async () => {
      jest.useFakeTimers();
      mockGetDiary.mockResolvedValue(mockDiaryData);
      mockSaveDiaryDebounced.mockResolvedValue(mockDiaryData);

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateEntry('1', { isPresent: false });
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockSaveDiaryDebounced).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('deve cancelar autosave anterior ao fazer nova atualização', async () => {
      jest.useFakeTimers();
      mockGetDiary.mockResolvedValue(mockDiaryData);

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateEntry('1', { isPresent: false });
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      act(() => {
        result.current.updateEntry('1', { isPresent: true });
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Deve ter sido chamado apenas uma vez (a última atualização)
      expect(mockSaveDiaryDebounced).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });
  });

  describe('Histórico', () => {
    it('deve carregar histórico', async () => {
      mockGetDiaryHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(mockGetDiaryHistory).toHaveBeenCalled();
      expect(result.current.history).toEqual(mockHistory);
    });

    it('deve mostrar loading durante carregamento do histórico', async () => {
      let resolveHistory: (value: any) => void;
      const historyPromise = new Promise(resolve => {
        resolveHistory = resolve;
      });
      mockGetDiaryHistory.mockReturnValue(historyPromise as any);

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      act(() => {
        result.current.loadHistory();
      });

      expect(result.current.isHistoryLoading).toBe(true);

      await act(async () => {
        resolveHistory!(mockHistory);
      });

      expect(result.current.isHistoryLoading).toBe(false);
    });
  });

  describe('Validação', () => {
    it('deve validar dados corretamente', () => {
      mockGetDiary.mockResolvedValue(mockDiaryData);
      mockValidateDiaryData.mockReturnValue({ isValid: true, errors: [] });

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      const validation = result.current.validateData();
      expect(mockValidateDiaryData).toHaveBeenCalledWith(mockDiaryData);
      expect(validation).toEqual({ isValid: true, errors: [] });
    });

    it('deve retornar erro se dados inválidos', () => {
      mockGetDiary.mockResolvedValue(mockDiaryData);
      mockValidateDiaryData.mockReturnValue({ 
        isValid: false, 
        errors: ['Data é obrigatória'] 
      });

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      const validation = result.current.validateData();
      expect(validation).toEqual({ 
        isValid: false, 
        errors: ['Data é obrigatória'] 
      });
    });
  });

  describe('Utilitários', () => {
    it('deve obter entrada corretamente', () => {
      mockGetDiary.mockResolvedValue(mockDiaryData);

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      const entry = result.current.getEntry('1');
      expect(entry).toEqual(mockEntries[0]);
    });

    it('deve retornar null para entrada não encontrada', () => {
      mockGetDiary.mockResolvedValue(mockDiaryData);

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      const entry = result.current.getEntry('999');
      expect(entry).toBeNull();
    });
  });

  describe('Estados de loading', () => {
    it('deve mostrar loading durante carregamento', async () => {
      let resolveGetDiary: (value: any) => void;
      const getDiaryPromise = new Promise(resolve => {
        resolveGetDiary = resolve;
      });
      mockGetDiary.mockReturnValue(getDiaryPromise as any);

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveGetDiary!(mockDiaryData);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('deve mostrar saving durante salvamento', async () => {
      let resolveSave: (value: any) => void;
      const savePromise = new Promise(resolve => {
        resolveSave = resolve;
      });
      mockSaveDiaryDebounced.mockReturnValue(savePromise as any);

      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateEntry('1', { isPresent: false });
      });

      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        resolveSave!(mockDiaryData);
      });

      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('Tratamento de erros', () => {
    it('deve limpar erro', () => {
      const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('deve limpar timeout ao desmontar', () => {
      jest.useFakeTimers();
      mockGetDiary.mockResolvedValue(mockDiaryData);

      const { unmount } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));

      act(() => {
        // Simula uma atualização que criaria um timeout
        const { result } = renderHook(() => useDiary({ classId: 'class-1', date: '2024-01-15' }));
        result.current.updateEntry('1', { isPresent: false });
      });

      unmount();

      // Não deve haver timeout pendente
      expect(jest.getTimerCount()).toBe(0);
      jest.useRealTimers();
    });
  });
});
