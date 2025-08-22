jest.mock('@/services/students');
jest.mock('@api');
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AlunosDaTurma from '@/components/AlunosDaTurma';
import { listStudents } from '@/services/students';

describe('AlunosDaTurma', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('loads and displays students', async () => {
    const students = [
      { id: 1, number: 1, name: 'Ana', email: 'ana@test.com' }
    ];
    listStudents.mockResolvedValue(students);
    const onEdit = jest.fn();

    render(<AlunosDaTurma classId="1" onEdit={onEdit} />);

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalledWith(students[0]);
  });
});
