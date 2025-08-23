jest.mock('@api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn() } }));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginAluno from '@/pages/LoginAluno';
import { loginStudent } from '@api';
import { toast } from 'react-toastify';

describe('LoginAluno', () => {
  test('submits form and navigates on success', async () => {
    loginStudent.mockResolvedValue(true);
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <LoginAluno />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'senha');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(loginStudent).toHaveBeenCalledWith({ email: 'a@b.com', password: 'senha' });
      expect(navigate).toHaveBeenCalledWith('/dashboard-aluno');
    });
  });

  test('shows error toast on failure', async () => {
    loginStudent.mockResolvedValue(false);
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <LoginAluno />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/E-mail/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/Senha/i), 'senha');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(loginStudent).toHaveBeenCalledWith({ email: 'a@b.com', password: 'senha' });
      expect(toast.error).toHaveBeenCalledWith('E-mail ou senha inválidos');
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
