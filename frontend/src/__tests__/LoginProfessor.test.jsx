jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginProfessor from '../pages/LoginProfessor';
import axios from 'axios';

describe('LoginProfessor', () => {
  test('submits form and navigates', async () => {
    axios.post.mockResolvedValue({ data: { token: '123' } });
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
      expect(axios.post).toHaveBeenCalledWith(
        '/auth/login-teacher',
        { email: 'prof@example.com', password: 'secret' }
      );
      expect(navigate).toHaveBeenCalledWith('/dashboard-professor');
    });
  });
});
