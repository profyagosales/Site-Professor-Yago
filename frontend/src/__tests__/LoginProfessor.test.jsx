import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
jest.mock('@/services/api');
const { api } = require('@/services/api');
import LoginProfessor from '@/pages/auth/LoginProfessor';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('LoginProfessor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('submits form and redirects on success', async () => {
  api.post.mockResolvedValue({ data: { success: true, data: { token: 't' } } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

  render(<MemoryRouter><LoginProfessor /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'prof@example.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
  expect(api.post).toHaveBeenCalledWith('/auth/login-teacher', {
        email: 'prof@example.com',
        password: 'secret',
      });
      expect(localStorage.getItem('role')).toBe('teacher');
  expect(navigate).toHaveBeenCalled();
    });
  });

  test('shows error message on failure', async () => {
  api.post.mockRejectedValue({ response: { data: { message: 'Falha' } } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

  render(<MemoryRouter><LoginProfessor /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'prof@example.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Falha')).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});

