jest.mock('@api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginProfessor from '@/pages/LoginProfessor';
import api, { pickData, toArray } from '@api';

describe('LoginProfessor', () => {
  test('submits form and navigates', async () => {
    localStorage.clear();
    api.post.mockResolvedValue({ data: { token: '123', role: 'teacher' } });
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <LoginProfessor />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText(/Email/i), 'prof@example.com');
    await userEvent.type(screen.getByPlaceholderText(/Senha/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/auth/login-teacher',
        { email: 'prof@example.com', password: 'secret' }
      );
      expect(navigate).toHaveBeenCalledWith('/dashboard-professor', { replace: true });
      expect(localStorage.getItem('token')).toBe('123');
      expect(localStorage.getItem('role')).toBe('teacher');
    });
  });
});
