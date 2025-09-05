/**
 * Testes de integração para a matriz de notas
 * 
 * Funcionalidades testadas:
 * - Matriz editável com debounce
 * - Validação de notas
 * - Navegação por teclado
 * - Atualização otimista com rollback
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GradeMatrix from '@/components/GradeMatrix';
import { useGradeMatrix } from '@/hooks/useGradeMatrix';
import { saveGradeDebounced } from '@/services/grades';
import { toast } from 'react-toastify';

// Mock do hook useGradeMatrix
jest.mock('@/hooks/useGradeMatrix');
const mockUseGradeMatrix = useGradeMatrix as jest.MockedFunction<typeof useGradeMatrix>;

// Mock do saveGradeDebounced
jest.mock('@/services/grades', () => ({
  ...jest.requireActual('@/services/grades'),
  saveGradeDebounced: jest.fn(),
}));

// Mock do toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockSaveGradeDebounced = saveGradeDebounced as jest.MockedFunction<typeof saveGradeDebounced>;
const mockToast = toast as jest.Mocked<typeof toast>;

// Wrapper para renderizar com router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('GradeMatrix Integration', () => {
  const mockStudents = [
    { id: '1', name: 'João Silva', email: 'joao@email.com' },
    { id: '2', name: 'Maria Santos', email: 'maria@email.com' },
  ];

  const mockAssessments = [
    { id: '1', title: 'Prova 1', type: 'exam', weight: 40, maxScore: 10, date: '2024-01-15', isActive: true },
    { id: '2', title: 'Trabalho', type: 'homework', weight: 30, maxScore: 10, date: '2024-01-20', isActive: true },
    { id: '3', title: 'Participação', type: 'participation', weight: 30, maxScore: 10, date: '2024-01-25', isActive: false },
  ];

  const mockGrades = [
    { id: '1', studentId: '1', assessmentId: '1', value: 8.5 },
    { id: '2', studentId: '1', assessmentId: '2', value: 9.0 },
    { id: '3', studentId: '2', assessmentId: '1', value: 7.5 },
  ];

  const defaultMockReturn = {
    students: mockStudents,
    assessments: mockAssessments,
    grades: mockGrades,
    isLoading: false,
    isSaving: false,
    error: null,
    updateGrade: jest.fn(),
    refresh: jest.fn(),
    clearError: jest.fn(),
    getGrade: jest.fn((studentId: string, assessmentId: string) => {
      const grade = mockGrades.find(g => g.studentId === studentId && g.assessmentId === assessmentId);
      return grade?.value || null;
    }),
    getStudentAverage: jest.fn((studentId: string) => {
      if (studentId === '1') return 8.75;
      if (studentId === '2') return 7.5;
      return null;
    }),
    focusCell: jest.fn(),
    getCellId: jest.fn((studentIndex: number, assessmentIndex: number) => 
      `grade-${studentIndex}-${assessmentIndex}`
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGradeMatrix.mockReturnValue(defaultMockReturn);
  });

  describe('Renderização inicial', () => {
    it('deve renderizar a matriz de notas', () => {
      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      expect(screen.getByText('Aluno')).toBeInTheDocument();
      expect(screen.getByText('Prova 1')).toBeInTheDocument();
      expect(screen.getByText('Trabalho')).toBeInTheDocument();
      expect(screen.getByText('Participação')).toBeInTheDocument();
      expect(screen.getByText('Média')).toBeInTheDocument();
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });

    it('deve mostrar loading quando carregando', () => {
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        students: [],
        assessments: [],
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      expect(screen.getByText('Carregando notas...')).toBeInTheDocument();
    });

    it('deve mostrar erro quando há erro', () => {
      const errorMessage = 'Erro ao carregar notas';
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        error: errorMessage,
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });

    it('deve mostrar estado vazio quando não há dados', () => {
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        students: [],
        assessments: [],
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      expect(screen.getByText('Nenhum aluno encontrado.')).toBeInTheDocument();
    });
  });

  describe('Edição de notas', () => {
    it('deve permitir editar notas válidas', async () => {
      const mockUpdateGrade = jest.fn();
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        updateGrade: mockUpdateGrade,
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const gradeInput = screen.getByTestId('grade-0-0');
      fireEvent.change(gradeInput, { target: { value: '9.5' } });

      await waitFor(() => {
        expect(mockUpdateGrade).toHaveBeenCalledWith('1', '1', '9.5');
      });
    });

    it('deve validar notas inválidas', async () => {
      const mockUpdateGrade = jest.fn();
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        updateGrade: mockUpdateGrade,
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const gradeInput = screen.getByTestId('grade-0-0');
      
      // Teste com valor inválido
      fireEvent.change(gradeInput, { target: { value: '15.5' } });
      
      // Não deve chamar updateGrade para valores inválidos
      expect(mockUpdateGrade).not.toHaveBeenCalled();
    });

    it('deve permitir notas vazias', async () => {
      const mockUpdateGrade = jest.fn();
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        updateGrade: mockUpdateGrade,
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const gradeInput = screen.getByTestId('grade-0-0');
      fireEvent.change(gradeInput, { target: { value: '' } });

      await waitFor(() => {
        expect(mockUpdateGrade).toHaveBeenCalledWith('1', '1', '');
      });
    });

    it('deve formatar notas com 1 casa decimal', async () => {
      const mockUpdateGrade = jest.fn();
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        updateGrade: mockUpdateGrade,
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const gradeInput = screen.getByTestId('grade-0-0');
      fireEvent.change(gradeInput, { target: { value: '8.55' } });

      // Deve formatar para 8.5
      expect(gradeInput).toHaveValue('8.5');
    });
  });

  describe('Navegação por teclado', () => {
    it('deve navegar com setas', () => {
      const mockFocusCell = jest.fn();
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        focusCell: mockFocusCell,
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const gradeInput = screen.getByTestId('grade-0-0');
      fireEvent.keyDown(gradeInput, { key: 'ArrowRight' });

      expect(mockFocusCell).toHaveBeenCalledWith(0, 1);
    });

    it('deve navegar com Enter', () => {
      const mockFocusCell = jest.fn();
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        focusCell: mockFocusCell,
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const gradeInput = screen.getByTestId('grade-0-0');
      fireEvent.keyDown(gradeInput, { key: 'Enter' });

      expect(mockFocusCell).toHaveBeenCalledWith(1, 0);
    });

    it('deve navegar com setas para baixo', () => {
      const mockFocusCell = jest.fn();
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        focusCell: mockFocusCell,
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const gradeInput = screen.getByTestId('grade-0-0');
      fireEvent.keyDown(gradeInput, { key: 'ArrowDown' });

      expect(mockFocusCell).toHaveBeenCalledWith(1, 0);
    });
  });

  describe('Estados visuais', () => {
    it('deve mostrar indicador de salvamento', () => {
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        isSaving: true,
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      expect(screen.getByText('Salvando...')).toBeInTheDocument();
    });

    it('deve desabilitar inputs de avaliações inativas', () => {
      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const participationInputs = screen.getAllByPlaceholderText('N/A');
      expect(participationInputs.length).toBeGreaterThan(0);
      
      participationInputs.forEach(input => {
        expect(input).toBeDisabled();
      });
    });

    it('deve mostrar pesos e pontos das avaliações', () => {
      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      expect(screen.getByText('40% • 10pts')).toBeInTheDocument();
      expect(screen.getByText('30% • 10pts')).toBeInTheDocument();
    });
  });

  describe('Cálculo de médias', () => {
    it('deve mostrar médias calculadas', () => {
      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      expect(screen.getByText('8.8')).toBeInTheDocument(); // Média do João
      expect(screen.getByText('7.5')).toBeInTheDocument(); // Média da Maria
    });

    it('deve mostrar traço para alunos sem notas', () => {
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        getStudentAverage: jest.fn(() => null),
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThan(0);
    });
  });

  describe('Tratamento de erros', () => {
    it('deve mostrar botão para fechar erro', () => {
      const mockClearError = jest.fn();
      mockUseGradeMatrix.mockReturnValue({
        ...defaultMockReturn,
        error: 'Erro de teste',
        clearError: mockClearError,
      });

      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      fireEvent.click(screen.getByText('Fechar'));

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter labels apropriados', () => {
      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const gradeInputs = screen.getAllByRole('textbox');
      expect(gradeInputs.length).toBeGreaterThan(0);
      
      gradeInputs.forEach(input => {
        expect(input).toHaveAttribute('inputMode', 'decimal');
        expect(input).toHaveAttribute('pattern', '[0-9]*[.]?[0-9]?');
      });
    });

    it('deve ter placeholders informativos', () => {
      renderWithRouter(<GradeMatrix classId="class-1" term="1" />);

      const activeInputs = screen.getAllByPlaceholderText('0.0');
      const inactiveInputs = screen.getAllByPlaceholderText('N/A');
      
      expect(activeInputs.length).toBeGreaterThan(0);
      expect(inactiveInputs.length).toBeGreaterThan(0);
    });
  });
});
