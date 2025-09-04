import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/store/AuthContext';
import { ROUTES } from '@/routes';
import RequireStudentAuth from '@/routes/RequireStudentAuth';
import ResumoAluno from '@/pages/aluno/ResumoAluno';
import NotasAluno from '@/pages/aluno/Notas';
import RecadosAluno from '@/pages/aluno/RecadosAluno';
import GabaritosAluno from '@/pages/aluno/Gabarito';

// Mock do localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock do AuthContext
const mockAuthContext = {
  state: {
    loading: false,
    role: 'aluno',
    user: { id: '1', name: 'Aluno Teste' },
  },
  login: jest.fn(),
  logout: jest.fn(),
};

// Mock do AuthProvider
const MockAuthProvider = ({ children, mockState = mockAuthContext }) => (
  <AuthProvider value={mockState}>{children}</AuthProvider>
);

// Componente de teste que renderiza as rotas protegidas
const TestRouter = ({ mockState = mockAuthContext }) => (
  <BrowserRouter>
    <MockAuthProvider mockState={mockState}>
      <RequireStudentAuth>
        <div>
          <ResumoAluno />
          <NotasAluno />
          <RecadosAluno />
          <GabaritosAluno />
        </div>
      </RequireStudentAuth>
    </MockAuthProvider>
  </BrowserRouter>
);

describe('AlunoRoutes', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  describe('Com token válido', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('valid-token');
    });

    it('deve renderizar ResumoAluno quando autenticado como aluno', () => {
      render(<TestRouter />);
      expect(screen.getByText('Resumo')).toBeInTheDocument();
    });

    it('deve renderizar NotasAluno quando autenticado como aluno', () => {
      render(<TestRouter />);
      expect(screen.getByText('Minhas Notas')).toBeInTheDocument();
    });

    it('deve renderizar RecadosAluno quando autenticado como aluno', () => {
      render(<TestRouter />);
      expect(screen.getByText('Recados')).toBeInTheDocument();
    });

    it('deve renderizar GabaritosAluno quando autenticado como aluno', () => {
      render(<TestRouter />);
      expect(screen.getByText('Gabaritos')).toBeInTheDocument();
    });
  });

  describe('Sem token', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
    });

    it('deve redirecionar para login quando não há token', async () => {
      const mockNavigate = jest.fn();
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));

      render(<TestRouter />);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.aluno.login, {
          replace: true,
          state: { from: expect.any(Object) },
        });
      });
    });
  });

  describe('Com role incorreto', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('valid-token');
    });

    it('deve redirecionar para login quando role não é aluno', async () => {
      const mockState = {
        ...mockAuthContext,
        state: {
          ...mockAuthContext.state,
          role: 'professor',
        },
      };

      const mockNavigate = jest.fn();
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));

      render(<TestRouter mockState={mockState} />);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.aluno.login, {
          replace: true,
          state: { from: expect.any(Object) },
        });
      });
    });
  });

  describe('Durante carregamento', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('valid-token');
    });

    it('deve mostrar loading quando state.loading é true', () => {
      const mockState = {
        ...mockAuthContext,
        state: {
          ...mockAuthContext.state,
          loading: true,
        },
      };

      render(<TestRouter mockState={mockState} />);
      expect(screen.getByText('Verificando autenticação...')).toBeInTheDocument();
    });
  });
});
