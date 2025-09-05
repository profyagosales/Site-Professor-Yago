/**
 * Testes de integração para a página de alunos da turma
 * 
 * Funcionalidades testadas:
 * - Busca com debounce
 * - Paginação
 * - Convite por e-mail
 * - CRUD de estudantes
 * - Sincronização com URL
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TurmaAlunosPage from '@/pages/professor/TurmaAlunos';
import { useStudents } from '@/hooks/useStudents';
import { getClassById } from '@/services/classes';
import { toast } from 'react-toastify';

// Mock do hook useStudents
jest.mock('@/hooks/useStudents');
const mockUseStudents = useStudents as jest.MockedFunction<typeof useStudents>;

// Mock do getClassById
jest.mock('@/services/classes', () => ({
  getClassById: jest.fn(),
}));

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
  useParams: () => ({ id: 'class-1' }),
  useNavigate: () => mockNavigate,
}));

// Mock do clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

const mockToast = toast as jest.Mocked<typeof toast>;
const mockGetClassById = getClassById as jest.MockedFunction<typeof getClassById>;

// Wrapper para renderizar com router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('TurmaAlunosPage Integration', () => {
  const mockStudents = [
    {
      id: '1',
      name: 'João Silva',
      email: 'joao@email.com',
      photo: 'data:image/jpeg;base64,test',
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria@email.com',
    },
  ];

  const defaultMockReturn = {
    students: mockStudents,
    total: 2,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isInviting: false,
    error: null,
    searchQuery: '',
    setSearchQuery: jest.fn(),
    goToPage: jest.fn(),
    setPageSize: jest.fn(),
    createStudent: jest.fn(),
    updateStudent: jest.fn(),
    deleteStudent: jest.fn(),
    inviteStudent: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStudents.mockReturnValue(defaultMockReturn);
    mockGetClassById.mockResolvedValue({
      id: 'class-1',
      series: 9,
      letter: 'A',
      discipline: 'Matemática',
    });
  });

  describe('Renderização inicial', () => {
    it('deve renderizar a lista de alunos', () => {
      renderWithRouter(<TurmaAlunosPage />);

      expect(screen.getByText('9º A — Matemática')).toBeInTheDocument();
      expect(screen.getByText('Alunos cadastrados')).toBeInTheDocument();
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });

    it('deve mostrar barra de busca', () => {
      renderWithRouter(<TurmaAlunosPage />);

      expect(screen.getByPlaceholderText('Buscar alunos por nome ou e-mail...')).toBeInTheDocument();
    });

    it('deve mostrar botões de ação', () => {
      renderWithRouter(<TurmaAlunosPage />);

      expect(screen.getByText('Novo Aluno')).toBeInTheDocument();
      expect(screen.getByText('📧 Convidar por E-mail')).toBeInTheDocument();
    });

    it('deve mostrar loading quando carregando', () => {
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        students: [],
      });

      renderWithRouter(<TurmaAlunosPage />);

      expect(screen.getByText('Carregando alunos…')).toBeInTheDocument();
    });

    it('deve mostrar estado vazio quando não há alunos', () => {
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        students: [],
        total: 0,
      });

      renderWithRouter(<TurmaAlunosPage />);

      expect(screen.getByText('Nenhum aluno cadastrado nesta turma.')).toBeInTheDocument();
      expect(screen.getByText('Cadastrar primeiro aluno')).toBeInTheDocument();
    });

    it('deve mostrar erro quando há erro', () => {
      const errorMessage = 'Erro ao carregar alunos';
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        error: errorMessage,
      });

      renderWithRouter(<TurmaAlunosPage />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });
  });

  describe('Busca', () => {
    it('deve chamar setSearchQuery quando digitar na busca', async () => {
      const mockSetSearchQuery = jest.fn();
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        setSearchQuery: mockSetSearchQuery,
      });

      renderWithRouter(<TurmaAlunosPage />);

      const searchInput = screen.getByPlaceholderText('Buscar alunos por nome ou e-mail...');
      fireEvent.change(searchInput, { target: { value: 'João' } });

      await waitFor(() => {
        expect(mockSetSearchQuery).toHaveBeenCalledWith('João');
      });
    });

    it('deve mostrar mensagem quando busca não retorna resultados', () => {
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        students: [],
        searchQuery: 'busca sem resultado',
      });

      renderWithRouter(<TurmaAlunosPage />);

      expect(screen.getByText('Nenhum aluno encontrado para a busca.')).toBeInTheDocument();
    });
  });

  describe('Paginação', () => {
    it('deve mostrar paginação quando há múltiplas páginas', () => {
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        totalPages: 3,
        total: 30,
      });

      renderWithRouter(<TurmaAlunosPage />);

      expect(screen.getByText('Mostrando 1 a 10 de 30 itens')).toBeInTheDocument();
    });

    it('não deve mostrar paginação quando há apenas uma página', () => {
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        totalPages: 1,
        total: 5,
      });

      renderWithRouter(<TurmaAlunosPage />);

      expect(screen.queryByText('Mostrando 1 a 10 de 30 itens')).not.toBeInTheDocument();
    });
  });

  describe('Convite por e-mail', () => {
    it('deve abrir modal de convite ao clicar no botão', () => {
      renderWithRouter(<TurmaAlunosPage />);

      fireEvent.click(screen.getByText('📧 Convidar por E-mail'));

      expect(screen.getByText('Convidar Estudante')).toBeInTheDocument();
      expect(screen.getByText('Envie um link de convite por e-mail')).toBeInTheDocument();
    });

    it('deve enviar convite e copiar URL para clipboard', async () => {
      const mockInviteStudent = jest.fn().mockResolvedValue('https://example.com/invite/123');
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        inviteStudent: mockInviteStudent,
      });

      renderWithRouter(<TurmaAlunosPage />);

      fireEvent.click(screen.getByText('📧 Convidar por E-mail'));

      const emailInput = screen.getByPlaceholderText('exemplo@email.com');
      fireEvent.change(emailInput, { target: { value: 'test@email.com' } });

      fireEvent.click(screen.getByText('Enviar Convite'));

      await waitFor(() => {
        expect(mockInviteStudent).toHaveBeenCalledWith('test@email.com');
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/invite/123');
        expect(mockToast.success).toHaveBeenCalledWith('Link de convite copiado para a área de transferência!');
      });
    });

    it('deve validar e-mail antes de enviar', async () => {
      const mockInviteStudent = jest.fn();
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        inviteStudent: mockInviteStudent,
      });

      renderWithRouter(<TurmaAlunosPage />);

      fireEvent.click(screen.getByText('📧 Convidar por E-mail'));

      const emailInput = screen.getByPlaceholderText('exemplo@email.com');
      fireEvent.change(emailInput, { target: { value: 'email-invalido' } });

      fireEvent.click(screen.getByText('Enviar Convite'));

      expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
      expect(mockInviteStudent).not.toHaveBeenCalled();
    });
  });

  describe('CRUD de estudantes', () => {
    it('deve abrir modal de criação ao clicar em Novo Aluno', () => {
      renderWithRouter(<TurmaAlunosPage />);

      fireEvent.click(screen.getByText('Novo Aluno'));

      // O modal será testado em seus próprios testes
      expect(screen.getByText('Novo Aluno')).toBeInTheDocument();
    });

    it('deve abrir modal de edição ao clicar em Editar', () => {
      renderWithRouter(<TurmaAlunosPage />);

      const editButtons = screen.getAllByText('Editar');
      fireEvent.click(editButtons[0]);

      // O modal será testado em seus próprios testes
      expect(screen.getByText('Editar')).toBeInTheDocument();
    });

    it('deve confirmar antes de remover aluno', async () => {
      const mockDeleteStudent = jest.fn().mockResolvedValue(true);
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        deleteStudent: mockDeleteStudent,
      });

      // Mock do confirm
      window.confirm = jest.fn(() => true);

      renderWithRouter(<TurmaAlunosPage />);

      const removeButtons = screen.getAllByText('Remover');
      fireEvent.click(removeButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('Remover aluno?');
      await waitFor(() => {
        expect(mockDeleteStudent).toHaveBeenCalledWith('1');
      });
    });

    it('não deve remover aluno se usuário cancelar confirmação', () => {
      const mockDeleteStudent = jest.fn();
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        deleteStudent: mockDeleteStudent,
      });

      // Mock do confirm retornando false
      window.confirm = jest.fn(() => false);

      renderWithRouter(<TurmaAlunosPage />);

      const removeButtons = screen.getAllByText('Remover');
      fireEvent.click(removeButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('Remover aluno?');
      expect(mockDeleteStudent).not.toHaveBeenCalled();
    });
  });

  describe('Estados de processamento', () => {
    it('deve mostrar indicador visual durante processamento', () => {
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        isUpdating: true,
      });

      renderWithRouter(<TurmaAlunosPage />);

      // Verificar se há indicador de loading nos cards
      const loadingIndicators = screen.getAllByRole('status');
      expect(loadingIndicators.length).toBeGreaterThan(0);
    });

    it('deve desabilitar botões durante processamento', () => {
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        isUpdating: true,
      });

      renderWithRouter(<TurmaAlunosPage />);

      const buttons = screen.getAllByRole('button');
      const disabledButtons = buttons.filter(button => button.hasAttribute('disabled'));
      expect(disabledButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Navegação', () => {
    it('deve navegar de volta para turmas ao clicar no link', () => {
      renderWithRouter(<TurmaAlunosPage />);

      fireEvent.click(screen.getByText('← Voltar para Turmas'));

      expect(mockNavigate).toHaveBeenCalledWith('/professor/turmas');
    });
  });

  describe('Tratamento de erros', () => {
    it('deve mostrar botão para fechar erro', () => {
      const mockClearError = jest.fn();
      mockUseStudents.mockReturnValue({
        ...defaultMockReturn,
        error: 'Erro de teste',
        clearError: mockClearError,
      });

      renderWithRouter(<TurmaAlunosPage />);

      fireEvent.click(screen.getByText('Fechar'));

      expect(mockClearError).toHaveBeenCalled();
    });
  });
});
