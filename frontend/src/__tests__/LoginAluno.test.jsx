jest.mock('@api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginAluno from '@/pages/LoginAluno';
import { loginStudent } from '@api';

describe('LoginAluno', () => {
  test('submits form and navigates', async () => {
    localStorage.clear();
    loginStudent.mockResolvedValue({ token: 'abc', role: 'student' });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <LoginAluno />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/Número/i), '1');
    await userEvent.type(screen.getByPlaceholderText(/Telefone/i), '999999999');
    await userEvent.type(screen.getByPlaceholderText(/Senha/i), 'senha');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(loginStudent).toHaveBeenCalledWith({
        rollNumber: '1',
        phone: '999999999',
        password: 'senha'
      });
      expect(navigate).toHaveBeenCalledWith('/dashboard-aluno', { replace: true });
      expect(localStorage.getItem('token')).toBe('abc');
      expect(localStorage.getItem('role')).toBe('student');
    });
  });
});
