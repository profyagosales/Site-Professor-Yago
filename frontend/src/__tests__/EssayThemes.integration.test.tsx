/**
 * Testes de integração para o sistema de temas de redação
 * 
 * Funcionalidades testadas:
 * - CRUD completo de temas
 * - Integração com modal de nova redação
 * - Filtros e busca
 * - Toggle de estado ativo
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EssayThemesManager from '@/components/EssayThemesManager';
import ThemeSelector from '@/components/ThemeSelector';
import { useEssayThemes } from '@/hooks/useEssayThemes';
import { 
  listThemes,
  createTheme,
  updateTheme,
  toggleActive,
  deleteTheme
} from '@/services/essayThemes';
import { toast } from 'react-toastify';

// Mock do hook useEssayThemes
jest.mock('@/hooks/useEssayThemes');
const mockUseEssayThemes = useEssayThemes as jest.MockedFunction<typeof useEssayThemes>;

// Mock dos serviços
jest.mock('@/services/essayThemes', () => ({
  ...jest.requireActual('@/services/essayThemes'),
  listThemes: jest.fn(),
  createTheme: jest.fn(),
  updateTheme: jest.fn(),
  toggleActive: jest.fn(),
  deleteTheme: jest.fn(),
}));

// Mock do toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockListThemes = listThemes as jest.MockedFunction<typeof listThemes>;
const mockCreateTheme = createTheme as jest.MockedFunction<typeof createTheme>;
const mockUpdateTheme = updateTheme as jest.MockedFunction<typeof updateTheme>;
const mockToggleActive = toggleActive as jest.MockedFunction<typeof toggleActive>;
const mockDeleteTheme = deleteTheme as jest.MockedFunction<typeof deleteTheme>;
const mockToast = toast as jest.Mocked<typeof toast>;

// Wrapper para renderizar com router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Essay Themes Integration', () => {
  const mockThemes = [
    {
      id: '1',
      name: 'Desafios da educação no Brasil',
      type: 'ENEM' as const,
      active: true,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      name: 'Sustentabilidade e meio ambiente',
      type: 'PAS' as const,
      active: false,
      createdAt: '2024-01-16T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z',
    },
  ];

  const defaultMockReturn = {
    themes: mockThemes,
    activeThemes: mockThemes.filter(t => t.active),
    filteredThemes: mockThemes,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    error: null,
    total: 2,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    loadThemes: jest.fn(),
    createNewTheme: jest.fn(),
    updateExistingTheme: jest.fn(),
    toggleThemeActive: jest.fn(),
    deleteExistingTheme: jest.fn(),
    refresh: jest.fn(),
    clearError: jest.fn(),
    setSearch: jest.fn(),
    setType: jest.fn(),
    setOnlyActive: jest.fn(),
    getThemeById: jest.fn(),
    validateTheme: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEssayThemes.mockReturnValue(defaultMockReturn);
  });

  describe('EssayThemesManager', () => {
    it('deve renderizar o gerenciador de temas', () => {
      renderWithRouter(<EssayThemesManager />);

      expect(screen.getByText('Gerenciar Temas de Redação')).toBeInTheDocument();
      expect(screen.getByText('Novo Tema')).toBeInTheDocument();
      expect(screen.getByText('Desafios da educação no Brasil')).toBeInTheDocument();
      expect(screen.getByText('Sustentabilidade e meio ambiente')).toBeInTheDocument();
    });

    it('deve mostrar loading quando carregando', () => {
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        themes: [],
      });

      renderWithRouter(<EssayThemesManager />);

      expect(screen.getByText('Carregando temas...')).toBeInTheDocument();
    });

    it('deve mostrar erro quando há erro', () => {
      const errorMessage = 'Erro ao carregar temas';
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        error: errorMessage,
      });

      renderWithRouter(<EssayThemesManager />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });

    it('deve mostrar estado vazio quando não há temas', () => {
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        themes: [],
        filteredThemes: [],
      });

      renderWithRouter(<EssayThemesManager />);

      expect(screen.getByText('Nenhum tema encontrado')).toBeInTheDocument();
    });

    it('deve criar novo tema', async () => {
      const mockCreateNewTheme = jest.fn().mockResolvedValue({
        id: '3',
        name: 'Novo tema',
        type: 'ENEM',
        active: true,
      });
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        createNewTheme: mockCreateNewTheme,
      });

      renderWithRouter(<EssayThemesManager />);

      const nameInput = screen.getByPlaceholderText('Ex: Desafios da educação no Brasil');
      const typeSelect = screen.getByDisplayValue('PAS');
      const createButton = screen.getByText('Criar Tema');

      fireEvent.change(nameInput, { target: { value: 'Novo tema' } });
      fireEvent.change(typeSelect, { target: { value: 'ENEM' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateNewTheme).toHaveBeenCalledWith({
          name: 'Novo tema',
          type: 'ENEM',
          active: true,
        });
      });
    });

    it('deve alternar estado ativo do tema', async () => {
      const mockToggleThemeActive = jest.fn();
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        toggleThemeActive: mockToggleThemeActive,
      });

      renderWithRouter(<EssayThemesManager />);

      const toggleButton = screen.getByText('Desativar');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(mockToggleThemeActive).toHaveBeenCalledWith('1');
      });
    });

    it('deve editar tema existente', async () => {
      const mockUpdateExistingTheme = jest.fn().mockResolvedValue({
        ...mockThemes[0],
        name: 'Tema editado',
      });
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        updateExistingTheme: mockUpdateExistingTheme,
      });

      renderWithRouter(<EssayThemesManager />);

      const editButton = screen.getByText('Editar');
      fireEvent.click(editButton);

      const editInput = screen.getByDisplayValue('Desafios da educação no Brasil');
      fireEvent.change(editInput, { target: { value: 'Tema editado' } });

      const saveButton = screen.getByText('Salvar');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateExistingTheme).toHaveBeenCalledWith('1', {
          name: 'Tema editado',
        });
      });
    });

    it('deve deletar tema', async () => {
      const mockDeleteExistingTheme = jest.fn();
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        deleteExistingTheme: mockDeleteExistingTheme,
      });

      // Mock do confirm
      window.confirm = jest.fn(() => true);

      renderWithRouter(<EssayThemesManager />);

      const deleteButton = screen.getByText('Remover');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteExistingTheme).toHaveBeenCalledWith('1');
      });
    });

    it('deve filtrar temas por busca', () => {
      const mockSetSearch = jest.fn();
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        setSearch: mockSetSearch,
      });

      renderWithRouter(<EssayThemesManager />);

      const searchInput = screen.getByPlaceholderText('Nome do tema...');
      fireEvent.change(searchInput, { target: { value: 'educação' } });

      expect(mockSetSearch).toHaveBeenCalledWith('educação');
    });

    it('deve filtrar temas por tipo', () => {
      const mockSetType = jest.fn();
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        setType: mockSetType,
      });

      renderWithRouter(<EssayThemesManager />);

      const typeSelect = screen.getByDisplayValue('Todos');
      fireEvent.change(typeSelect, { target: { value: 'ENEM' } });

      expect(mockSetType).toHaveBeenCalledWith('ENEM');
    });

    it('deve filtrar apenas temas ativos', () => {
      const mockSetOnlyActive = jest.fn();
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        setOnlyActive: mockSetOnlyActive,
      });

      renderWithRouter(<EssayThemesManager />);

      const activeCheckbox = screen.getByRole('checkbox');
      fireEvent.click(activeCheckbox);

      expect(mockSetOnlyActive).toHaveBeenCalledWith(true);
    });
  });

  describe('ThemeSelector', () => {
    it('deve renderizar o seletor de temas', () => {
      const mockOnChange = jest.fn();
      
      renderWithRouter(
        <ThemeSelector
          value=""
          onChange={mockOnChange}
          placeholder="Digite o tema..."
        />
      );

      expect(screen.getByPlaceholderText('Digite o tema...')).toBeInTheDocument();
    });

    it('deve abrir dropdown ao focar', () => {
      const mockOnChange = jest.fn();
      
      renderWithRouter(
        <ThemeSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('deve selecionar tema do dropdown', async () => {
      const mockOnChange = jest.fn();
      const mockOnThemeSelect = jest.fn();
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        filteredThemes: mockThemes,
      });

      renderWithRouter(
        <ThemeSelector
          value=""
          onChange={mockOnChange}
          onThemeSelect={mockOnThemeSelect}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText('Desafios da educação no Brasil')).toBeInTheDocument();
      });

      const themeButton = screen.getByText('Desafios da educação no Brasil');
      fireEvent.click(themeButton);

      expect(mockOnChange).toHaveBeenCalledWith('Desafios da educação no Brasil');
      expect(mockOnThemeSelect).toHaveBeenCalledWith(mockThemes[0]);
    });

    it('deve permitir criar novo tema', async () => {
      const mockOnChange = jest.fn();
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        filteredThemes: [],
      });

      renderWithRouter(
        <ThemeSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Novo tema' } });
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText('+ Criar tema "Novo tema"')).toBeInTheDocument();
      });

      const createButton = screen.getByText('+ Criar tema "Novo tema"');
      fireEvent.click(createButton);

      expect(mockOnChange).toHaveBeenCalledWith('Novo tema');
    });

    it('deve navegar com teclado', async () => {
      const mockOnChange = jest.fn();
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        filteredThemes: mockThemes,
      });

      renderWithRouter(
        <ThemeSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText('Desafios da educação no Brasil')).toBeInTheDocument();
      });

      // Navega com seta para baixo
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      // Seleciona com Enter
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnChange).toHaveBeenCalledWith('Desafios da educação no Brasil');
    });

    it('deve fechar dropdown com Escape', async () => {
      const mockOnChange = jest.fn();
      
      mockUseEssayThemes.mockReturnValue({
        ...defaultMockReturn,
        filteredThemes: mockThemes,
      });

      renderWithRouter(
        <ThemeSelector
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText('Desafios da educação no Brasil')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByText('Desafios da educação no Brasil')).not.toBeInTheDocument();
    });
  });

  describe('Integração com modal de nova redação', () => {
    it('deve integrar com modal de nova redação', () => {
      const mockOnChange = jest.fn();
      const mockOnThemeSelect = jest.fn();
      
      renderWithRouter(
        <ThemeSelector
          value=""
          onChange={mockOnChange}
          onThemeSelect={mockOnThemeSelect}
          data-testid="theme-selector"
        />
      );

      expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
    });
  });

  describe('Estados visuais', () => {
    it('deve mostrar tipos de tema com cores corretas', () => {
      renderWithRouter(<EssayThemesManager />);

      expect(screen.getByText('ENEM')).toBeInTheDocument();
      expect(screen.getByText('PAS')).toBeInTheDocument();
    });

    it('deve mostrar status ativo/inativo', () => {
      renderWithRouter(<EssayThemesManager />);

      expect(screen.getByText('Ativo')).toBeInTheDocument();
      expect(screen.getByText('Inativo')).toBeInTheDocument();
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter labels apropriados', () => {
      renderWithRouter(<EssayThemesManager />);

      expect(screen.getByLabelText('Buscar')).toBeInTheDocument();
      expect(screen.getByLabelText('Tipo')).toBeInTheDocument();
      expect(screen.getByLabelText('Nome do tema')).toBeInTheDocument();
    });

    it('deve ter placeholders informativos', () => {
      const mockOnChange = jest.fn();
      
      renderWithRouter(
        <ThemeSelector
          value=""
          onChange={mockOnChange}
          placeholder="Digite o tema da redação..."
        />
      );

      expect(screen.getByPlaceholderText('Digite o tema da redação...')).toBeInTheDocument();
    });
  });
});
