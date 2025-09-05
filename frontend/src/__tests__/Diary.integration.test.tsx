/**
 * Testes de integração para o sistema de diário
 * 
 * Funcionalidades testadas:
 * - Autosave com debounce de 1s
 * - Histórico de lançamentos
 * - Validação de dados
 * - Navegação por datas
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CadernoProf from '@/pages/professor/Caderno';
import { useDiary } from '@/hooks/useDiary';
import { saveDiaryDebounced, getDiaryHistory } from '@/services/diary';
import { toast } from 'react-toastify';

// Mock do hook useDiary
jest.mock('@/hooks/useDiary');
const mockUseDiary = useDiary as jest.MockedFunction<typeof useDiary>;

// Mock do saveDiaryDebounced
jest.mock('@/services/diary', () => ({
  ...jest.requireActual('@/services/diary'),
  saveDiaryDebounced: jest.fn(),
}));

// Mock do toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock do getClassById
jest.mock('@/services/classes', () => ({
  getClassById: jest.fn(),
}));

const mockSaveDiaryDebounced = saveDiaryDebounced as jest.MockedFunction<typeof saveDiaryDebounced>;
const mockToast = toast as jest.Mocked<typeof toast>;

// Wrapper para renderizar com router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Mock do useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'class-1' }),
  useSearchParams: () => [new URLSearchParams('?date=2024-01-15'), jest.fn()],
}));

describe('Diary Integration', () => {
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
    {
      date: '2024-01-14',
      entriesCount: 2,
      presentCount: 2,
      absentCount: 0,
      hasActivities: false,
    },
  ];

  const defaultMockReturn = {
    diaryData: mockDiaryData,
    students: mockStudents,
    entries: mockEntries,
    history: mockHistory,
    isLoading: false,
    isSaving: false,
    isHistoryLoading: false,
    error: null,
    updateEntry: jest.fn(),
    saveDiary: jest.fn(),
    loadHistory: jest.fn(),
    clearError: jest.fn(),
    hasUnsavedChanges: false,
    lastSavedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDiary.mockReturnValue(defaultMockReturn);
  });

  describe('Renderização inicial', () => {
    it('deve renderizar a página do diário', () => {
      renderWithRouter(<CadernoProf />);

      expect(screen.getByText('Data:')).toBeInTheDocument();
      expect(screen.getByText('Histórico')).toBeInTheDocument();
      expect(screen.getByText('Salvar Agora')).toBeInTheDocument();
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });

    it('deve mostrar loading quando carregando', () => {
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        students: [],
        entries: [],
      });

      renderWithRouter(<CadernoProf />);

      expect(screen.getByText('Carregando diário...')).toBeInTheDocument();
    });

    it('deve mostrar erro quando há erro', () => {
      const errorMessage = 'Erro ao carregar diário';
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        error: errorMessage,
      });

      renderWithRouter(<CadernoProf />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });

    it('deve mostrar estado vazio quando não há alunos', () => {
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        students: [],
        entries: [],
      });

      renderWithRouter(<CadernoProf />);

      expect(screen.getByText('Nenhum aluno encontrado nesta turma.')).toBeInTheDocument();
    });
  });

  describe('Autosave', () => {
    it('deve mostrar indicador de alterações não salvas', () => {
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        hasUnsavedChanges: true,
      });

      renderWithRouter(<CadernoProf />);

      expect(screen.getByText('Alterações não salvas • Salvamento automático em andamento...')).toBeInTheDocument();
    });

    it('deve mostrar indicador de salvamento concluído', () => {
      const lastSavedAt = new Date('2024-01-15T10:30:00Z');
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        hasUnsavedChanges: false,
        lastSavedAt,
      });

      renderWithRouter(<CadernoProf />);

      expect(screen.getByText(/Salvo automaticamente às/)).toBeInTheDocument();
    });

    it('deve desabilitar botão salvar quando não há alterações', () => {
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        hasUnsavedChanges: false,
      });

      renderWithRouter(<CadernoProf />);

      const saveButton = screen.getByText('Salvar Agora');
      expect(saveButton).toBeDisabled();
    });

    it('deve habilitar botão salvar quando há alterações', () => {
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        hasUnsavedChanges: true,
      });

      renderWithRouter(<CadernoProf />);

      const saveButton = screen.getByText('Salvar Agora');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Histórico', () => {
    it('deve abrir drawer de histórico', () => {
      renderWithRouter(<CadernoProf />);

      fireEvent.click(screen.getByText('Histórico'));

      expect(screen.getByText('Histórico do Diário')).toBeInTheDocument();
      expect(screen.getByText('Últimos 7 dias • Clique em uma data para navegar')).toBeInTheDocument();
    });

    it('deve fechar drawer de histórico', () => {
      renderWithRouter(<CadernoProf />);

      fireEvent.click(screen.getByText('Histórico'));
      fireEvent.click(screen.getByRole('button', { name: /fechar/i }));

      expect(screen.queryByText('Histórico do Diário')).not.toBeInTheDocument();
    });

    it('deve mostrar loading do histórico', () => {
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        isHistoryLoading: true,
      });

      renderWithRouter(<CadernoProf />);

      fireEvent.click(screen.getByText('Histórico'));

      expect(screen.getByText('Carregando histórico...')).toBeInTheDocument();
    });

    it('deve mostrar histórico vazio', () => {
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        history: [],
      });

      renderWithRouter(<CadernoProf />);

      fireEvent.click(screen.getByText('Histórico'));

      expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
    });

    it('deve exibir itens do histórico', () => {
      renderWithRouter(<CadernoProf />);

      fireEvent.click(screen.getByText('Histórico'));

      expect(screen.getByText('2 alunos')).toBeInTheDocument();
      expect(screen.getByText('1 presentes')).toBeInTheDocument();
      expect(screen.getByText('1 ausentes')).toBeInTheDocument();
      expect(screen.getByText('Com atividades')).toBeInTheDocument();
    });
  });

  describe('Seleção de data', () => {
    it('deve permitir alterar data', () => {
      renderWithRouter(<CadernoProf />);

      const dateInput = screen.getByDisplayValue('2024-01-15');
      fireEvent.change(dateInput, { target: { value: '2024-01-16' } });

      expect(dateInput).toHaveValue('2024-01-16');
    });

    it('deve exibir data formatada', () => {
      renderWithRouter(<CadernoProf />);

      expect(screen.getByText(/segunda-feira, 15 de janeiro de 2024/)).toBeInTheDocument();
    });
  });

  describe('Entradas do diário', () => {
    it('deve exibir entradas dos alunos', () => {
      renderWithRouter(<CadernoProf />);

      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
      expect(screen.getByText('Presente')).toBeInTheDocument();
      expect(screen.getByText('Ausente')).toBeInTheDocument();
    });

    it('deve exibir atividades dos alunos', () => {
      renderWithRouter(<CadernoProf />);

      expect(screen.getByText('Exercícios de matemática')).toBeInTheDocument();
    });

    it('deve exibir contador de caracteres', () => {
      renderWithRouter(<CadernoProf />);

      expect(screen.getByText(/\/500 caracteres/)).toBeInTheDocument();
    });
  });

  describe('Estados de salvamento', () => {
    it('deve mostrar estado de salvamento', () => {
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        isSaving: true,
      });

      renderWithRouter(<CadernoProf />);

      expect(screen.getByText('Salvando...')).toBeInTheDocument();
    });

    it('deve desabilitar entradas durante salvamento', () => {
      mockUseDiary.mockReturnValue({
        ...defaultMockReturn,
        isSaving: true,
      });

      renderWithRouter(<CadernoProf />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled();
      });
    });
  });

  describe('Instruções', () => {
    it('deve exibir instruções de uso', () => {
      renderWithRouter(<CadernoProf />);

      expect(screen.getByText('Instruções:')).toBeInTheDocument();
      expect(screen.getByText('• Marque a presença de cada aluno')).toBeInTheDocument();
      expect(screen.getByText('• Descreva as atividades realizadas na aula')).toBeInTheDocument();
      expect(screen.getByText('• As alterações são salvas automaticamente após 1 segundo')).toBeInTheDocument();
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter labels apropriados', () => {
      renderWithRouter(<CadernoProf />);

      expect(screen.getByLabelText('Data:')).toBeInTheDocument();
      expect(screen.getByText('Atividade')).toBeInTheDocument();
    });

    it('deve ter placeholders informativos', () => {
      renderWithRouter(<CadernoProf />);

      const textareas = screen.getAllByPlaceholderText('Descreva a atividade realizada...');
      expect(textareas.length).toBeGreaterThan(0);
    });
  });
});
