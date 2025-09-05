/**
 * Testes para o hook useClasses
 * 
 * Funcionalidades testadas:
 * - CRUD com atualização otimista
 * - Rollback em caso de erro
 * - Validações
 * - Estados de loading
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useClasses } from '@/hooks/useClasses';
import { 
  listClasses, 
  createClass, 
  updateClass, 
  deleteClass,
  canDeleteClass,
  validateClassData 
} from '@/services/classes';
import { toast } from 'react-toastify';

// Mock dos serviços
jest.mock('@/services/classes', () => ({
  listClasses: jest.fn(),
  createClass: jest.fn(),
  updateClass: jest.fn(),
  deleteClass: jest.fn(),
  canDeleteClass: jest.fn(),
  validateClassData: jest.fn(),
  generateClassName: jest.fn((series, letter) => `${series}ª ${letter}`),
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

const mockListClasses = listClasses as jest.MockedFunction<typeof listClasses>;
const mockCreateClass = createClass as jest.MockedFunction<typeof createClass>;
const mockUpdateClass = updateClass as jest.MockedFunction<typeof updateClass>;
const mockDeleteClass = deleteClass as jest.MockedFunction<typeof deleteClass>;
const mockCanDeleteClass = canDeleteClass as jest.MockedFunction<typeof canDeleteClass>;
const mockValidateClassData = validateClassData as jest.MockedFunction<typeof validateClassData>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('useClasses', () => {
  const mockClasses = [
    {
      id: '1',
      series: 9,
      letter: 'A',
      discipline: 'Matemática',
      schedule: [{ day: 'segunda', slot: 1, time: '08:00' }],
      studentCount: 25,
    },
  ];

  const validPayload = {
    series: 8,
    letter: 'B',
    discipline: 'Português',
    schedule: [{ day: 'terça', slot: 2, time: '10:00' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockListClasses.mockResolvedValue(mockClasses);
    mockValidateClassData.mockReturnValue({ isValid: true, errors: {} });
  });

  describe('Inicialização', () => {
    it('deve carregar classes automaticamente', async () => {
      const { result } = renderHook(() => useClasses({ autoLoad: true }));

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.classes).toEqual(mockClasses);
      expect(mockListClasses).toHaveBeenCalled();
    });

    it('não deve carregar automaticamente se autoLoad for false', () => {
      renderHook(() => useClasses({ autoLoad: false }));

      expect(mockListClasses).not.toHaveBeenCalled();
    });
  });

  describe('Criação de turma', () => {
    it('deve criar turma com sucesso', async () => {
      const newClass = { id: '2', ...validPayload };
      mockCreateClass.mockResolvedValue(newClass);

      const { result } = renderHook(() => useClasses());

      await act(async () => {
        await result.current.createClass(validPayload);
      });

      expect(mockCreateClass).toHaveBeenCalledWith(validPayload);
      expect(result.current.classes).toContain(newClass);
      expect(mockToast.success).toHaveBeenCalled();
    });

    it('deve fazer rollback em caso de erro na criação', async () => {
      const error = new Error('Erro de criação');
      mockCreateClass.mockRejectedValue(error);

      const { result } = renderHook(() => useClasses());

      const initialClasses = result.current.classes;

      await act(async () => {
        await result.current.createClass(validPayload);
      });

      expect(result.current.classes).toEqual(initialClasses);
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('deve validar dados antes de criar', async () => {
      const validationError = { isValid: false, errors: { series: 'Série inválida' } };
      mockValidateClassData.mockReturnValue(validationError);

      const { result } = renderHook(() => useClasses());

      await act(async () => {
        await result.current.createClass(validPayload);
      });

      expect(mockCreateClass).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('Série inválida');
    });
  });

  describe('Atualização de turma', () => {
    it('deve atualizar turma com sucesso', async () => {
      const updatedClass = { id: '1', ...validPayload };
      mockUpdateClass.mockResolvedValue(updatedClass);

      const { result } = renderHook(() => useClasses());

      await act(async () => {
        await result.current.updateClass('1', validPayload);
      });

      expect(mockUpdateClass).toHaveBeenCalledWith('1', validPayload);
      expect(mockToast.success).toHaveBeenCalled();
    });

    it('deve fazer rollback em caso de erro na atualização', async () => {
      const error = new Error('Erro de atualização');
      mockUpdateClass.mockRejectedValue(error);

      const { result } = renderHook(() => useClasses());

      const initialClasses = result.current.classes;

      await act(async () => {
        await result.current.updateClass('1', validPayload);
      });

      expect(result.current.classes).toEqual(initialClasses);
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('Exclusão de turma', () => {
    it('deve excluir turma com sucesso', async () => {
      mockCanDeleteClass.mockResolvedValue(true);
      mockDeleteClass.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClasses());

      await act(async () => {
        const success = await result.current.deleteClass('1');
        expect(success).toBe(true);
      });

      expect(mockCanDeleteClass).toHaveBeenCalledWith('1');
      expect(mockDeleteClass).toHaveBeenCalledWith('1');
      expect(mockToast.success).toHaveBeenCalled();
    });

    it('não deve excluir se turma tiver alunos', async () => {
      mockCanDeleteClass.mockResolvedValue(false);

      const { result } = renderHook(() => useClasses());

      await act(async () => {
        const success = await result.current.deleteClass('1');
        expect(success).toBe(false);
      });

      expect(mockDeleteClass).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('deve fazer rollback em caso de erro na exclusão', async () => {
      mockCanDeleteClass.mockResolvedValue(true);
      const error = new Error('Erro de exclusão');
      mockDeleteClass.mockRejectedValue(error);

      const { result } = renderHook(() => useClasses());

      const initialClasses = result.current.classes;

      await act(async () => {
        const success = await result.current.deleteClass('1');
        expect(success).toBe(false);
      });

      expect(result.current.classes).toEqual(initialClasses);
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('Estados de loading', () => {
    it('deve mostrar loading durante criação', async () => {
      let resolveCreate: (value: any) => void;
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve;
      });
      mockCreateClass.mockReturnValue(createPromise as any);

      const { result } = renderHook(() => useClasses());

      act(() => {
        result.current.createClass(validPayload);
      });

      expect(result.current.isCreating).toBe(true);

      await act(async () => {
        resolveCreate!({ id: '2', ...validPayload });
      });

      expect(result.current.isCreating).toBe(false);
    });

    it('deve mostrar loading durante atualização', async () => {
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise(resolve => {
        resolveUpdate = resolve;
      });
      mockUpdateClass.mockReturnValue(updatePromise as any);

      const { result } = renderHook(() => useClasses());

      act(() => {
        result.current.updateClass('1', validPayload);
      });

      expect(result.current.isUpdating).toBe(true);

      await act(async () => {
        resolveUpdate!({ id: '1', ...validPayload });
      });

      expect(result.current.isUpdating).toBe(false);
    });

    it('deve mostrar loading durante exclusão', async () => {
      let resolveDelete: (value: any) => void;
      const deletePromise = new Promise(resolve => {
        resolveDelete = resolve;
      });
      mockCanDeleteClass.mockResolvedValue(true);
      mockDeleteClass.mockReturnValue(deletePromise as any);

      const { result } = renderHook(() => useClasses());

      act(() => {
        result.current.deleteClass('1');
      });

      expect(result.current.isDeleting).toBe(true);

      await act(async () => {
        resolveDelete!(undefined);
      });

      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe('Utilitários', () => {
    it('deve limpar erro', () => {
      const { result } = renderHook(() => useClasses());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('deve validar dados de turma', () => {
      const validation = { isValid: true, errors: {} };
      mockValidateClassData.mockReturnValue(validation);

      const { result } = renderHook(() => useClasses());

      const resultValidation = result.current.validateClass(validPayload);

      expect(resultValidation).toEqual(validation);
      expect(mockValidateClassData).toHaveBeenCalledWith(validPayload);
    });

    it('deve verificar se pode deletar', async () => {
      mockCanDeleteClass.mockResolvedValue(true);

      const { result } = renderHook(() => useClasses());

      let canDelete: boolean;
      await act(async () => {
        canDelete = await result.current.canDelete('1');
      });

      expect(canDelete!).toBe(true);
      expect(mockCanDeleteClass).toHaveBeenCalledWith('1');
    });
  });
});
