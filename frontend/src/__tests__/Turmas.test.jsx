jest.mock('@/lib/http');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Turmas from '@/pages/Turmas';

jest.mock('@/components/ClassModal', () => () => <div />);

jest.mock('@/services/classes', () => ({
  listClasses: jest.fn().mockResolvedValue([
    { _id: '1', series: '1', letter: 'A', discipline: 'Mat' },
  ]),
  createClass: jest.fn(),
  updateClass: jest.fn(),
  deleteClass: jest.fn(),
}));

describe('Turmas page', () => {
  test('navigates to turma students', async () => {
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <Turmas />
      </MemoryRouter>
    );

    const button = await screen.findByRole('button', { name: /Ver alunos/i });
    await userEvent.click(button);
    expect(navigate).toHaveBeenCalledWith('/turmas/1/alunos');
  });
});
