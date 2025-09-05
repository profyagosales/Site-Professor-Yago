/**
 * Testes de integração para a página de turmas
 * 
 * Funcionalidades testadas:
 * - CRUD completo de turmas
 * - Atualização otimista
 * - Validações e tratamento de erros
 * - UX e interações do usuário
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TurmasPage from '@/pages/professor/Turmas';
import { useClasses } from '@/hooks/useClasses';
import { toast } from 'react-toastify';

// Mock do hook useClasses
jest.mock('@/hooks/useClasses');
const mockUseClasses = useClasses as jest.MockedFunction<typeof useClasses>;

// Mock do toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock do react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock dos serviços
jest.mock('@/services/classes', () => ({
  generateClassName: jest.fn((series, letter) => `${series}ª ${letter}`),
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

describe('TurmasPage Integration', () => {
  const mockClasses = [
    {
      id: '1',
      series: 9,
      letter: 'A',
      discipline: 'Matemática',
      schedule: [{ day: 'segunda', slot: 1, time: '08:00' }],
      studentCount: 25,
    },
    {
      id: '2',
      series: 8,
      letter: 'B',
      discipline: 'Português',
      schedule: [{ day: 'terça', slot: 2, time: '10:00' }],
      studentCount: 30,
    },
  ];

  const defaultMockReturn = {
    classes: mockClasses,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    error: null,
    createClass: jest.fn(),
    updateClass: jest.fn(),
    deleteClass: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseClasses.mockReturnValue(defaultMockReturn);
  });

  describe('Renderização inicial', () => {
    it('deve renderizar a lista de turmas', () => {
      renderWithRouter(<TurmasPage />);

      expect(screen.getByText('Turmas')).toBeInTheDocument();
      expect(screen.getByText('Gerencie turmas, alunos e avaliações.')).toBeInTheDocument();
      expect(screen.getByText('Nova Turma')).toBeInTheDocument();
      expect(screen.getByText('9ª A')).toBeInTheDocument();
      expect(screen.getByText('8ª B')).toBeInTheDocument();
    });

    it('deve mostrar loading quando carregando', () => {
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        classes: [],
      });

      renderWithRouter(<TurmasPage />);

      expect(screen.getByText('Carregando turmas…')).toBeInTheDocument();
    });

    it('deve mostrar estado vazio quando não há turmas', () => {
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        classes: [],
      });

      renderWithRouter(<TurmasPage />);

      expect(screen.getByText('Nenhuma turma encontrada.')).toBeInTheDocument();
      expect(screen.getByText('Criar primeira turma')).toBeInTheDocument();
    });

    it('deve mostrar erro quando há erro', () => {
      const errorMessage = 'Erro ao carregar turmas';
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        error: errorMessage,
      });

      renderWithRouter(<TurmasPage />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });
  });

  describe('Criação de turma', () => {
    it('deve abrir modal ao clicar em Nova Turma', () => {
      renderWithRouter(<TurmasPage />);

      fireEvent.click(screen.getByText('Nova Turma'));

      expect(screen.getByText('Nova Turma')).toBeInTheDocument();
      expect(screen.getByText('Criar')).toBeInTheDocument();
    });

    it('deve chamar createClass ao submeter formulário', async () => {
      const mockCreateClass = jest.fn().mockResolvedValue({ id: '3', series: 7, letter: 'C' });
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        createClass: mockCreateClass,
      });

      renderWithRouter(<TurmasPage />);

      fireEvent.click(screen.getByText('Nova Turma'));

      // Preencher formulário
      fireEvent.change(screen.getByDisplayValue(''), { target: { value: '7' } }); // série
      fireEvent.change(screen.getByPlaceholderText('Ex: A, B, C'), { target: { value: 'C' } }); // letra
      fireEvent.change(screen.getByPlaceholderText('Ex: Matemática, Português'), { target: { value: 'História' } }); // disciplina

      fireEvent.click(screen.getByText('Criar'));

      await waitFor(() => {
        expect(mockCreateClass).toHaveBeenCalledWith({
          series: 7,
          letter: 'C',
          discipline: 'História',
          schedule: [{ day: '', slot: NaN, time: '' }],
        });
      });
    });

    it('deve mostrar loading durante criação', () => {
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        isCreating: true,
      });

      renderWithRouter(<TurmasPage />);

      fireEvent.click(screen.getByText('Nova Turma'));

      expect(screen.getByText('Criando...')).toBeInTheDocument();
    });
  });

  describe('Edição de turma', () => {
    it('deve abrir modal de edição ao clicar em Editar', () => {
      renderWithRouter(<TurmasPage />);

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Editar Turma')).toBeInTheDocument();
      expect(screen.getByText('Salvar')).toBeInTheDocument();
    });

    it('deve chamar updateClass ao submeter edição', async () => {
      const mockUpdateClass = jest.fn().mockResolvedValue({ id: '1', series: 9, letter: 'A' });
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        updateClass: mockUpdateClass,
      });

      renderWithRouter(<TurmasPage />);

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      fireEvent.click(screen.getByText('Salvar'));

      await waitFor(() => {
        expect(mockUpdateClass).toHaveBeenCalled();
      });
    });

    it('deve mostrar loading durante edição', () => {
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        isUpdating: true,
      });

      renderWithRouter(<TurmasPage />);

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      expect(screen.getByText('Salvando...')).toBeInTheDocument();
    });
  });

  describe('Exclusão de turma', () => {
    it('deve abrir modal de confirmação ao clicar em Excluir', () => {
      renderWithRouter(<TurmasPage />);

      const deleteButtons = screen.getAllByText('Excluir');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Excluir Turma')).toBeInTheDocument();
      expect(screen.getByText('Tem certeza que deseja excluir a turma "9ª A"?')).toBeInTheDocument();
    });

    it('deve chamar deleteClass ao confirmar exclusão', async () => {
      const mockDeleteClass = jest.fn().mockResolvedValue(true);
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        deleteClass: mockDeleteClass,
      });

      renderWithRouter(<TurmasPage />);

      const deleteButtons = screen.getAllByText('Excluir');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByText('Excluir'));

      await waitFor(() => {
        expect(mockDeleteClass).toHaveBeenCalledWith('1');
      });
    });

    it('deve mostrar loading durante exclusão', () => {
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        isDeleting: true,
      });

      renderWithRouter(<TurmasPage />);

      const deleteButtons = screen.getAllByText('Excluir');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Processando...')).toBeInTheDocument();
    });
  });

  describe('Navegação', () => {
    it('deve navegar para turma de alunos ao clicar em Ver alunos', () => {
      renderWithRouter(<TurmasPage />);

      const verAlunosButtons = screen.getAllByText('Ver alunos');
      fireEvent.click(verAlunosButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/professor/turmas/1/alunos');
    });
  });

  describe('Estados de processamento', () => {
    it('deve mostrar indicador visual durante processamento', () => {
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        isUpdating: true,
      });

      renderWithRouter(<TurmasPage />);

      // Verificar se há indicador de loading nos cards
      const loadingIndicators = screen.getAllByRole('status');
      expect(loadingIndicators.length).toBeGreaterThan(0);
    });

    it('deve desabilitar botões durante processamento', () => {
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        isUpdating: true,
      });

      renderWithRouter(<TurmasPage />);

      const buttons = screen.getAllByRole('button');
      const disabledButtons = buttons.filter(button => button.hasAttribute('disabled'));
      expect(disabledButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Tratamento de erros', () => {
    it('deve mostrar botão para fechar erro', () => {
      const mockClearError = jest.fn();
      mockUseClasses.mockReturnValue({
        ...defaultMockReturn,
        error: 'Erro de teste',
        clearError: mockClearError,
      });

      renderWithRouter(<TurmasPage />);

      fireEvent.click(screen.getByText('Fechar'));

      expect(mockClearError).toHaveBeenCalled();
    });
  });
});
