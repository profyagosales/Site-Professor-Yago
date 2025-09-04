import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequireAuth from '@/routes/RequireAuth';

// Mock dos componentes
jest.mock('@/pages/Landing', () => {
  return function Landing() {
    return <div data-testid="landing">Landing Page</div>;
  };
});

jest.mock('@/pages/auth/LoginProfessor', () => {
  return function LoginProfessor() {
    return <div data-testid="login-professor">Login Professor</div>;
  };
});

jest.mock('@/pages/auth/LoginAluno', () => {
  return function LoginAluno() {
    return <div data-testid="login-aluno">Login Aluno</div>;
  };
});

jest.mock('@/pages/DashboardProfessor', () => {
  return function DashboardProfessor() {
    return <div data-testid="dashboard-professor">Dashboard Professor</div>;
  };
});

jest.mock('@/pages/DashboardAluno', () => {
  return function DashboardAluno() {
    return <div data-testid="dashboard-aluno">Dashboard Aluno</div>;
  };
});

describe('Routes - RequireAuth Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('redirects to login when no token', () => {
    render(
      <MemoryRouter initialEntries={['/professor/resumo']}>
        <RequireAuth>
          <div data-testid="protected-content">Protected Content</div>
        </RequireAuth>
      </MemoryRouter>
    );

    // Sem token → redireciona para login
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('renders protected content when token exists', () => {
    localStorage.setItem('auth_token', 'test-token');

    render(
      <MemoryRouter initialEntries={['/professor/resumo']}>
        <RequireAuth>
          <div data-testid="protected-content">Protected Content</div>
        </RequireAuth>
      </MemoryRouter>
    );

    // Com token → renderiza conteúdo protegido
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  test('handles token validation correctly', () => {
    // Teste sem token
    render(
      <MemoryRouter initialEntries={['/aluno/resumo']}>
        <RequireAuth>
          <div data-testid="student-content">Student Content</div>
        </RequireAuth>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('student-content')).not.toBeInTheDocument();

    // Limpar e testar com token
    localStorage.clear();
    localStorage.setItem('auth_token', 'student-token');

    render(
      <MemoryRouter initialEntries={['/aluno/resumo']}>
        <RequireAuth>
          <div data-testid="student-content">Student Content</div>
        </RequireAuth>
      </MemoryRouter>
    );

    expect(screen.getByTestId('student-content')).toBeInTheDocument();
  });
});
