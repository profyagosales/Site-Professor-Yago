import { render, screen } from '@testing-library/react';
import TurmaAlunos from '@/pages/professor/TurmaAlunos';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
}));

jest.mock('@/services/students', () => ({
  listStudents: jest.fn(() => Promise.resolve([
    { id: 's1', name: 'João Silva', email: 'joao@ex.com' },
  ])),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));
jest.mock('@/services/classes', () => ({
  getClassById: jest.fn(() => Promise.resolve({ series: 1, letter: 'A', discipline: 'Português' })),
}));

describe('TurmaAlunosPage', () => {
  test('renders table with students', async () => {
    render(<MemoryRouter><TurmaAlunos /></MemoryRouter>);
    expect(await screen.findByText('João Silva')).toBeInTheDocument();
    expect(await screen.findByText('joao@ex.com')).toBeInTheDocument();
  });
});

