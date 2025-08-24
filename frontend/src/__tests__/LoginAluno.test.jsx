import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import LoginAluno from '@/pages/auth/LoginAluno';

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
    axios.post.mockResolvedValue({ status: 200, data: { token: 'abc' } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(<LoginAluno />);

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'senha');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/auth/login-student', {
        email: 'a@b.com',
        password: 'senha',
      });
      expect(localStorage.getItem('student_token')).toBe('abc');
      expect(navigate).toHaveBeenCalledWith('/dashboard-aluno');
    });
  });

  test('shows error message on failure', async () => {
    axios.post.mockRejectedValue({ response: { data: { message: 'Erro' } } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(<LoginAluno />);

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'senha');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro')).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});

