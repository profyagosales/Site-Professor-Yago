import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AlunosDaTurma from '@/components/AlunosDaTurma';

describe('AlunosDaTurma', () => {
  test('displays students passed via prop', async () => {
    const students = [
      { id: 1, rollNumber: 1, name: 'Ana', email: 'ana@test.com' },
    ];
    const onEdit = jest.fn();

    render(<AlunosDaTurma students={students} onEdit={onEdit} />);

    expect(screen.getByText('Ana')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalledWith(students[0]);
  });
});
