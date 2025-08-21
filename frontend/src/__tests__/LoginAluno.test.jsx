jest.mock('@/services/api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginAluno from '@/pages/LoginAluno';
import api, { pickData, toArray } from '@/services/api';

describe('LoginAluno', () => {
  test('submits form and navigates', async () => {
    api.post.mockResolvedValue({ data: { token: 'abc' } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <LoginAluno />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'aluno@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Senha/i), 'senha');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/auth/login-student',
        { email: 'aluno@example.com', password: 'senha' }
      );
      expect(navigate).toHaveBeenCalledWith('/dashboard-aluno');
    });
  });
});
