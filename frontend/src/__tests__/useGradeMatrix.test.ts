/**
 * Testes para o hook useGradeMatrix
 * 
 * Funcionalidades testadas:
 * - Carregamento da matriz
 * - Atualização de notas com debounce
 * - Validação de notas
 * - Atualização otimista com rollback
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useGradeMatrix } from '@/hooks/useGradeMatrix';
import { 
  getClassGrades, 
  saveGradeDebounced,
  validateGradeValue,
  formatGradeValue,
  parseGradeValue,
  calculateStudentAverage
} from '@/services/grades';
import { toast } from 'react-toastify';

// Mock dos serviços
jest.mock('@/services/grades', () => ({
  getClassGrades: jest.fn(),
  saveGradeDebounced: jest.fn(),
  validateGradeValue: jest.fn(),
  formatGradeValue: jest.fn(),
  parseGradeValue: jest.fn(),
  calculateStudentAverage: jest.fn(),
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

const mockGetClassGrades = getClassGrades as jest.MockedFunction<typeof getClassGrades>;
const mockSaveGradeDebounced = saveGradeDebounced as jest.MockedFunction<typeof saveGradeDebounced>;
const mockValidateGradeValue = validateGradeValue as jest.MockedFunction<typeof validateGradeValue>;
const mockFormatGradeValue = formatGradeValue as jest.MockedFunction<typeof formatGradeValue>;
const mockParseGradeValue = parseGradeValue as jest.MockedFunction<typeof parseGradeValue>;
const mockCalculateStudentAverage = calculateStudentAverage as jest.MockedFunction<typeof calculateStudentAverage>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('useGradeMatrix', () => {
  const mockStudents = [
    { id: '1', name: 'João Silva', email: 'joao@email.com' },
    { id: '2', name: 'Maria Santos', email: 'maria@email.com' },
  ];

  const mockAssessments = [
    { id: '1', title: 'Prova 1', type: 'exam', weight: 40, maxScore: 10, date: '2024-01-15', isActive: true },
    { id: '2', title: 'Trabalho', type: 'homework', weight: 30, maxScore: 10, date: '2024-01-20', isActive: true },
  ];

  const mockGrades = [
    { id: '1', studentId: '1', assessmentId: '1', value: 8.5 },
    { id: '2', studentId: '1', assessmentId: '2', value: 9.0 },
  ];

  const mockMatrix = {
    students: mockStudents,
    assessments: mockAssessments,
    grades: mockGrades,
    classId: 'class-1',
    term: '1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClassGrades.mockResolvedValue(mockMatrix);
    mockValidateGradeValue.mockReturnValue({ isValid: true });
    mockFormatGradeValue.mockImplementation((value) => value !== null ? value.toFixed(1) : '');
    mockParseGradeValue.mockImplementation((input) => input ? parseFloat(input) : null);
    mockCalculateStudentAverage.mockReturnValue(8.75);
  });

  describe('Inicialização', () => {
    it('deve carregar matriz automaticamente', async () => {
      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.matrix).toEqual(mockMatrix);
      expect(result.current.students).toEqual(mockStudents);
      expect(result.current.assessments).toEqual(mockAssessments);
      expect(result.current.grades).toEqual(mockGrades);
    });

    it('não deve carregar se classId for vazio', () => {
      renderHook(() => useGradeMatrix({ classId: '', term: '1' }));

      expect(mockGetClassGrades).not.toHaveBeenCalled();
    });
  });

  describe('Atualização de notas', () => {
    it('deve atualizar nota com sucesso', async () => {
      const mockSavePromise = Promise.resolve({ id: '3', studentId: '1', assessmentId: '1', value: 9.0 });
      mockSaveGradeDebounced.mockReturnValue(mockSavePromise);

      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateGrade('1', '1', '9.0');
      });

      expect(mockParseGradeValue).toHaveBeenCalledWith('9.0');
      expect(mockValidateGradeValue).toHaveBeenCalledWith(9.0);
      expect(mockSaveGradeDebounced).toHaveBeenCalledWith({
        studentId: '1',
        assessmentId: '1',
        value: 9.0,
        classId: 'class-1',
        term: '1',
      });
    });

    it('deve validar nota antes de salvar', () => {
      mockValidateGradeValue.mockReturnValue({ isValid: false, error: 'Valor inválido' });

      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      act(() => {
        result.current.updateGrade('1', '1', '15.0');
      });

      expect(mockValidateGradeValue).toHaveBeenCalledWith(15.0);
      expect(mockSaveGradeDebounced).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('Valor inválido');
    });

    it('deve fazer rollback em caso de erro', async () => {
      const error = new Error('Erro de salvamento');
      mockSaveGradeDebounced.mockRejectedValue(error);

      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const initialGrades = result.current.grades;

      act(() => {
        result.current.updateGrade('1', '1', '9.0');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.grades).toEqual(initialGrades);
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('Utilitários', () => {
    it('deve obter nota corretamente', () => {
      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      act(() => {
        result.current.updateGrade('1', '1', '9.0');
      });

      const grade = result.current.getGrade('1', '1');
      expect(grade).toBe(9.0);
    });

    it('deve calcular média do estudante', () => {
      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      const average = result.current.getStudentAverage('1');
      expect(mockCalculateStudentAverage).toHaveBeenCalledWith('1', mockGrades, mockAssessments);
      expect(average).toBe(8.75);
    });

    it('deve validar nota', () => {
      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      const validation = result.current.validateGrade('8.5');
      expect(mockValidateGradeValue).toHaveBeenCalledWith(8.5);
      expect(validation).toEqual({ isValid: true });
    });

    it('deve formatar nota', () => {
      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      const formatted = result.current.formatGrade(8.5);
      expect(mockFormatGradeValue).toHaveBeenCalledWith(8.5);
      expect(formatted).toBe('8.5');
    });
  });

  describe('Navegação', () => {
    it('deve focar em célula específica', () => {
      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      act(() => {
        result.current.focusCell(0, 1);
      });

      expect(result.current.getCellId(0, 1)).toBe('grade-0-1');
    });

    it('deve gerar ID de célula corretamente', () => {
      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      const cellId = result.current.getCellId(2, 3);
      expect(cellId).toBe('grade-2-3');
    });
  });

  describe('Estados de loading', () => {
    it('deve mostrar loading durante carregamento', async () => {
      let resolveGetClassGrades: (value: any) => void;
      const getClassGradesPromise = new Promise(resolve => {
        resolveGetClassGrades = resolve;
      });
      mockGetClassGrades.mockReturnValue(getClassGradesPromise as any);

      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveGetClassGrades!(mockMatrix);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('deve mostrar saving durante salvamento', async () => {
      let resolveSave: (value: any) => void;
      const savePromise = new Promise(resolve => {
        resolveSave = resolve;
      });
      mockSaveGradeDebounced.mockReturnValue(savePromise as any);

      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.updateGrade('1', '1', '9.0');
      });

      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        resolveSave!({ id: '3', studentId: '1', assessmentId: '1', value: 9.0 });
      });

      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('Tratamento de erros', () => {
    it('deve limpar erro', () => {
      const { result } = renderHook(() => useGradeMatrix({ classId: 'class-1', term: '1' }));

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
