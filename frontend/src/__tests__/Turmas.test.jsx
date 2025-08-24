import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Turmas from '@/pages/professor/Turmas';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('TurmasPage', () => {
  test('navigates to alunos list', async () => {
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(<Turmas />);

    const button = screen.getAllByRole('button', { name: /Ver alunos/i })[0];
    await userEvent.click(button);
    expect(navigate).toHaveBeenCalledWith('/turmas/2A/alunos');
  });
});

