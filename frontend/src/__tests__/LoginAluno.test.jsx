import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginAluno from '@/pages/auth/LoginAluno';

// Mock da API
jest.mock('@/services/api', () => ({
  api: { post: jest.fn() },
  setAuthToken: jest.fn(),
  STORAGE_TOKEN_KEY: 'auth_token',
}));

// Mock do react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

const { api, setAuthToken } = require('@/services/api');

describe('LoginAluno', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('submits form and redirects on success', async () => {
    // mock api.post('/auth/login-student') → 200 { token:'x' }
    api.post.mockResolvedValue({ data: { token: 'test-token' } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <LoginAluno />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'aluno@example.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'senha123');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      // assert salva token, chama setAuthToken, navega pra resumo certo
      expect(api.post).toHaveBeenCalledWith('/auth/login-student', {
        email: 'aluno@example.com',
        password: 'senha123',
      });
      expect(localStorage.getItem('auth_token')).toBe('test-token');
      expect(localStorage.getItem('role')).toBe('student');
      expect(setAuthToken).toHaveBeenCalledWith('test-token');
      expect(navigate).toHaveBeenCalledWith('/aluno/resumo', { replace: true });
    });
  });

  test('shows error message on failure', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Erro no login' } } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <LoginAluno />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'aluno@example.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro no login')).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });
});

