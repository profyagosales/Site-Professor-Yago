jest.mock('@api');
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewStudentModal from '@/components/NewStudentModal';
import { createStudent } from '@/services/students';

jest.mock('@/services/students', () => ({
  createStudent: jest.fn(),
}));

describe('NewStudentModal', () => {
  test('creates student via service', async () => {
    createStudent.mockResolvedValue({ id: 'abc' });
    const onClose = jest.fn();
    const onCreated = jest.fn();
    render(<NewStudentModal classId="1" isOpen={true} onClose={onClose} onCreated={onCreated} />);

    const number = screen.getByPlaceholderText('Ex.: 12');
    const name = screen.getByPlaceholderText('Nome completo');
    const phone = screen.getByPlaceholderText('(61) 9 9999-9999');
    const email = screen.getByPlaceholderText('aluno@exemplo.com');
    const password = screen.getByPlaceholderText('Crie uma senha');

    await userEvent.type(number, '1');
    await userEvent.type(name, 'João');
    await userEvent.type(phone, '123456');
    await userEvent.type(email, 'joao@example.com');
    await userEvent.type(password, 'segredo');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(createStudent).toHaveBeenCalledTimes(1);
    const fd = createStudent.mock.calls[0][0];
    expect(fd.get('name')).toBe('João');
    expect(fd.get('email')).toBe('joao@example.com');
    expect(onClose).toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledWith({ id: 'abc' });
  });
});
