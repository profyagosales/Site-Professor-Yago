import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Turmas from '@/pages/professor/Turmas';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('TurmasPage', () => {
  test('navigates to alunos list', async () => {
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <Turmas />
      </MemoryRouter>
    );

    const buttons = screen.queryAllByRole('button', { name: /Ver alunos/i });
    if (buttons[0]) {
      await userEvent.click(buttons[0]);
      expect(navigate).toHaveBeenCalled();
    }
  });
});
