import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '@/pages/Landing';
import NotFound from '@/pages/NotFound';

// Mock do useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Navigation Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Landing Page Navigation', () => {
    test('Sou Aluno button navigates to correct route', () => {
      render(
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      );

      const souAlunoButton = screen.getByTestId('cta-aluno');
      expect(souAlunoButton).toBeInTheDocument();
      expect(souAlunoButton).toHaveTextContent('Sou Aluno');

      fireEvent.click(souAlunoButton);
      expect(mockNavigate).toHaveBeenCalledWith('/login-aluno');
    });

    test('Sou Professor button navigates to correct route', () => {
      render(
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      );

      const souProfessorButton = screen.getByTestId('cta-prof');
      expect(souProfessorButton).toBeInTheDocument();
      expect(souProfessorButton).toHaveTextContent('Sou Professor');

      fireEvent.click(souProfessorButton);
      expect(mockNavigate).toHaveBeenCalledWith('/login-professor');
    });
  });

  describe('NotFound Page Navigation', () => {
    test('Página inicial button navigates to home', () => {
      render(
        <MemoryRouter>
          <NotFound />
        </MemoryRouter>
      );

      const paginaInicialButton = screen.getByText('Página inicial');
      expect(paginaInicialButton).toBeInTheDocument();

      // Verifica se o link aponta para a rota correta
      const link = paginaInicialButton.closest('a');
      expect(link).toHaveAttribute('href', '/');
    });

    test('Login do Aluno button navigates to correct route', () => {
      render(
        <MemoryRouter>
          <NotFound />
        </MemoryRouter>
      );

      const loginAlunoButton = screen.getByText('Login do Aluno');
      expect(loginAlunoButton).toBeInTheDocument();

      // Verifica se o link aponta para a rota correta
      const link = loginAlunoButton.closest('a');
      expect(link).toHaveAttribute('href', '/login-aluno');
    });

    test('Login do Professor button navigates to correct route', () => {
      render(
        <MemoryRouter>
          <NotFound />
        </MemoryRouter>
      );

      const loginProfessorButton = screen.getByText('Login do Professor');
      expect(loginProfessorButton).toBeInTheDocument();

      // Verifica se o link aponta para a rota correta
      const link = loginProfessorButton.closest('a');
      expect(link).toHaveAttribute('href', '/login-professor');
    });

    test('all navigation buttons are present', () => {
      render(
        <MemoryRouter>
          <NotFound />
        </MemoryRouter>
      );

      expect(screen.getByText('Página inicial')).toBeInTheDocument();
      expect(screen.getByText('Login do Aluno')).toBeInTheDocument();
      expect(screen.getByText('Login do Professor')).toBeInTheDocument();
    });
  });
});
