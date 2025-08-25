import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import LoginProfessor from '@/pages/auth/LoginProfessor';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('LoginProfessor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('submits form and redirects on success', async () => {
    axios.post.mockResolvedValue({ data: { success: true } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(<LoginProfessor />);

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'prof@example.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/auth/login-teacher', {
        email: 'prof@example.com',
        password: 'secret',
      });
      expect(localStorage.getItem('role')).toBe('teacher');
      expect(navigate).toHaveBeenCalledWith('/professor/dashboard', { replace: true });
    });
  });

  test('shows error message on failure', async () => {
    axios.post.mockRejectedValue({ response: { data: { message: 'Falha' } } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(<LoginProfessor />);

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'prof@example.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Falha')).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});

