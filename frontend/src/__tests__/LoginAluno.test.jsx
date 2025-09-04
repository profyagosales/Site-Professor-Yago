import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
jest.mock('@/services/api', () => ({
  api: { post: jest.fn() },
  setAuthToken: jest.fn(),
}));
const { api } = require('@/services/api');
import LoginAluno from '@/pages/auth/LoginAluno';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('LoginAluno', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('submits form and redirects on success', async () => {
  api.post.mockResolvedValue({ data: { success: true, data: { token: 't' } } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

  render(<MemoryRouter><LoginAluno /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'senha');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
  expect(api.post).toHaveBeenCalledWith('/auth/login-student', {
        email: 'a@b.com',
        password: 'senha',
      });
      expect(localStorage.getItem('role')).toBe('student');
  expect(navigate).toHaveBeenCalled();
    });
  });

  test('shows error message on failure', async () => {
  api.post.mockRejectedValue({ response: { data: { message: 'Erro' } } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

  render(<MemoryRouter><LoginAluno /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'senha');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro')).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});

