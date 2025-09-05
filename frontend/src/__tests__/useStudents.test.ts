/**
 * Testes para o hook useStudents
 * 
 * Funcionalidades testadas:
 * - Busca com debounce
 * - Paginação
 * - CRUD com atualização otimista
 * - Convite por e-mail
 * - Sincronização com URL
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useStudents } from '@/hooks/useStudents';
import { 
  listStudents, 
  createStudent, 
  updateStudent, 
  removeStudent,
  inviteStudent,
  validateStudentData,
  validateInviteData
} from '@/services/students';
import { toast } from 'react-toastify';

// Mock dos serviços
jest.mock('@/services/students', () => ({
  listStudents: jest.fn(),
  createStudent: jest.fn(),
  updateStudent: jest.fn(),
  removeStudent: jest.fn(),
  inviteStudent: jest.fn(),
  validateStudentData: jest.fn(),
  validateInviteData: jest.fn(),
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

// Mock do useSearchParams
const mockSetSearchParams = jest.fn();
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [
    new URLSearchParams(),
    mockSetSearchParams,
  ],
}));

const mockListStudents = listStudents as jest.MockedFunction<typeof listStudents>;
const mockCreateStudent = createStudent as jest.MockedFunction<typeof createStudent>;
const mockUpdateStudent = updateStudent as jest.MockedFunction<typeof updateStudent>;
const mockRemoveStudent = removeStudent as jest.MockedFunction<typeof removeStudent>;
const mockInviteStudent = inviteStudent as jest.MockedFunction<typeof inviteStudent>;
const mockValidateStudentData = validateStudentData as jest.MockedFunction<typeof validateStudentData>;
const mockValidateInviteData = validateInviteData as jest.MockedFunction<typeof validateInviteData>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('useStudents', () => {
  const mockStudents = [
    {
      id: '1',
      name: 'João Silva',
      email: 'joao@email.com',
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria@email.com',
    },
  ];

  const mockStudentListResponse = {
    items: mockStudents,
    page: 1,
    pageSize: 10,
    total: 2,
    totalPages: 1,
  };

  const validStudentPayload = {
    name: 'Novo Aluno',
    email: 'novo@email.com',
    phone: '(11) 99999-9999',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockListStudents.mockResolvedValue(mockStudentListResponse);
    mockValidateStudentData.mockReturnValue({ isValid: true, errors: {} });
    mockValidateInviteData.mockReturnValue({ isValid: true, errors: {} });
  });

  describe('Inicialização', () => {
    it('deve carregar estudantes automaticamente', async () => {
      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.students).toEqual(mockStudents);
      expect(mockListStudents).toHaveBeenCalledWith({
        classId: 'class-1',
        q: undefined,
        page: 1,
        pageSize: 10,
      });
    });

    it('não deve carregar automaticamente se classId for vazio', () => {
      renderHook(() => useStudents({ classId: '' }));

      expect(mockListStudents).not.toHaveBeenCalled();
    });
  });

  describe('Busca', () => {
    it('deve atualizar searchQuery', () => {
      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      act(() => {
        result.current.setSearchQuery('João');
      });

      expect(result.current.searchQuery).toBe('João');
    });

    it('deve recarregar estudantes quando searchQuery mudar', async () => {
      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setSearchQuery('João');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 400)); // Aguardar debounce
      });

      expect(mockListStudents).toHaveBeenCalledWith({
        classId: 'class-1',
        q: 'João',
        page: 1,
        pageSize: 10,
      });
    });
  });

  describe('Paginação', () => {
    it('deve navegar para página específica', () => {
      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.currentPage).toBe(3);
    });

    it('deve alterar tamanho da página', () => {
      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      act(() => {
        result.current.setPageSize(20);
      });

      expect(result.current.pageSize).toBe(20);
      expect(result.current.currentPage).toBe(1); // Deve voltar para primeira página
    });
  });

  describe('Criação de estudante', () => {
    it('deve criar estudante com sucesso', async () => {
      const newStudent = { id: '3', ...validStudentPayload };
      mockCreateStudent.mockResolvedValue(newStudent);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let createdStudent: any;
      await act(async () => {
        createdStudent = await result.current.createStudent(validStudentPayload);
      });

      expect(createdStudent).toEqual(newStudent);
      expect(mockCreateStudent).toHaveBeenCalledWith('class-1', validStudentPayload);
      expect(result.current.students).toContain(newStudent);
      expect(mockToast.success).toHaveBeenCalled();
    });

    it('deve validar dados antes de criar', async () => {
      const validationError = { isValid: false, errors: { name: 'Nome é obrigatório' } };
      mockValidateStudentData.mockReturnValue(validationError);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let createdStudent: any;
      await act(async () => {
        createdStudent = await result.current.createStudent(validStudentPayload);
      });

      expect(createdStudent).toBeNull();
      expect(mockCreateStudent).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('Nome é obrigatório');
    });

    it('deve fazer rollback em caso de erro na criação', async () => {
      const error = new Error('Erro de criação');
      mockCreateStudent.mockRejectedValue(error);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const initialStudents = result.current.students;

      let createdStudent: any;
      await act(async () => {
        createdStudent = await result.current.createStudent(validStudentPayload);
      });

      expect(createdStudent).toBeNull();
      expect(result.current.students).toEqual(initialStudents);
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('Atualização de estudante', () => {
    it('deve atualizar estudante com sucesso', async () => {
      const updatedStudent = { id: '1', ...validStudentPayload };
      mockUpdateStudent.mockResolvedValue(updatedStudent);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let updated: any;
      await act(async () => {
        updated = await result.current.updateStudent('1', validStudentPayload);
      });

      expect(updated).toEqual(updatedStudent);
      expect(mockUpdateStudent).toHaveBeenCalledWith('class-1', '1', validStudentPayload);
      expect(mockToast.success).toHaveBeenCalled();
    });
  });

  describe('Exclusão de estudante', () => {
    it('deve excluir estudante com sucesso', async () => {
      mockRemoveStudent.mockResolvedValue(undefined);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let deleted: boolean;
      await act(async () => {
        deleted = await result.current.deleteStudent('1');
      });

      expect(deleted).toBe(true);
      expect(mockRemoveStudent).toHaveBeenCalledWith('class-1', '1');
      expect(result.current.students).not.toContainEqual(expect.objectContaining({ id: '1' }));
      expect(mockToast.success).toHaveBeenCalled();
    });

    it('deve fazer rollback em caso de erro na exclusão', async () => {
      const error = new Error('Erro de exclusão');
      mockRemoveStudent.mockRejectedValue(error);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const initialStudents = result.current.students;

      let deleted: boolean;
      await act(async () => {
        deleted = await result.current.deleteStudent('1');
      });

      expect(deleted).toBe(false);
      expect(result.current.students).toEqual(initialStudents);
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('Convite por e-mail', () => {
    it('deve enviar convite com sucesso', async () => {
      const inviteResponse = { inviteUrl: 'https://example.com/invite/123' };
      mockInviteStudent.mockResolvedValue(inviteResponse);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      let inviteUrl: string | null;
      await act(async () => {
        inviteUrl = await result.current.inviteStudent('test@email.com');
      });

      expect(inviteUrl).toBe('https://example.com/invite/123');
      expect(mockInviteStudent).toHaveBeenCalledWith({ classId: 'class-1', email: 'test@email.com' });
      expect(mockToast.success).toHaveBeenCalled();
    });

    it('deve validar e-mail antes de enviar convite', async () => {
      const validationError = { isValid: false, errors: { email: 'E-mail inválido' } };
      mockValidateInviteData.mockReturnValue(validationError);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      let inviteUrl: string | null;
      await act(async () => {
        inviteUrl = await result.current.inviteStudent('email-invalido');
      });

      expect(inviteUrl).toBeNull();
      expect(mockInviteStudent).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('E-mail inválido');
    });
  });

  describe('Estados de loading', () => {
    it('deve mostrar loading durante criação', async () => {
      let resolveCreate: (value: any) => void;
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve;
      });
      mockCreateStudent.mockReturnValue(createPromise as any);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.createStudent(validStudentPayload);
      });

      expect(result.current.isCreating).toBe(true);

      await act(async () => {
        resolveCreate!({ id: '3', ...validStudentPayload });
      });

      expect(result.current.isCreating).toBe(false);
    });
  });

  describe('Utilitários', () => {
    it('deve limpar erro', () => {
      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('deve validar dados de estudante', () => {
      const validation = { isValid: true, errors: {} };
      mockValidateStudentData.mockReturnValue(validation);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      const resultValidation = result.current.validateStudent(validStudentPayload);

      expect(resultValidation).toEqual(validation);
      expect(mockValidateStudentData).toHaveBeenCalledWith(validStudentPayload);
    });

    it('deve validar dados de convite', () => {
      const validation = { isValid: true, errors: {} };
      mockValidateInviteData.mockReturnValue(validation);

      const { result } = renderHook(() => useStudents({ classId: 'class-1' }));

      const resultValidation = result.current.validateInvite('test@email.com');

      expect(resultValidation).toEqual(validation);
      expect(mockValidateInviteData).toHaveBeenCalledWith('test@email.com');
    });
  });
});
