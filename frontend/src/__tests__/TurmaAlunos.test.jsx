jest.mock('@api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TurmaAlunos from '@/pages/TurmaAlunos';

jest.mock('@/components/NewStudentModal', () => () => <div />);

jest.mock('@/services/classes', () => ({
  getClassById: jest.fn(),
}));

jest.mock('@/services/students', () => ({
  listStudentsByClass: jest.fn(),
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe('TurmaAlunos page', () => {
  test('renders class info and students', async () => {
    require('react-router-dom').useParams.mockReturnValue({ classId: '1' });
    const { getClassById } = require('@/services/classes');
    const { listStudentsByClass } = require('@/services/students');
    getClassById.mockResolvedValue({ series: 1, letter: 'A', discipline: 'Mat' });
    listStudentsByClass.mockResolvedValue([
      { id: 1, number: 1, name: 'Ana', phone: '123', email: 'a@test.com' },
    ]);

    render(
      <MemoryRouter>
        <TurmaAlunos />
      </MemoryRouter>
    );

    expect(await screen.findByText('1º A — Mat')).toBeInTheDocument();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
  });

  test('shows not found message', async () => {
    require('react-router-dom').useParams.mockReturnValue({ classId: '99' });
    const { getClassById } = require('@/services/classes');
    const { listStudentsByClass } = require('@/services/students');
    getClassById.mockRejectedValue({ response: { status: 404 } });
    listStudentsByClass.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <TurmaAlunos />
      </MemoryRouter>
    );

    expect(await screen.findByText('Turma não encontrada')).toBeInTheDocument();
  });
});
