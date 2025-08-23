jest.mock('@api');
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentModal from '@/components/StudentModal';

describe('StudentModal', () => {
  test('submits student data', async () => {
    const onSubmit = jest.fn();
    render(
      <StudentModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />
    );

    const rollNumber = screen.getByText('Número').parentElement.querySelector('input');
    const name = screen.getByText('Nome').parentElement.querySelector('input');
    const phone = screen.getByText('Telefone').parentElement.querySelector('input');
    const email = screen.getByText('E-mail').parentElement.querySelector('input');
    const password = screen.getByText('Senha').parentElement.querySelector('input');

    await userEvent.type(rollNumber, '1');
    await userEvent.type(name, 'João');
    await userEvent.type(phone, '123456');
    await userEvent.type(email, 'joao@example.com');
    await userEvent.type(password, 'segredo');
    await userEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      rollNumber: 1,
      name: 'João',
      phone: '123456',
      email: 'joao@example.com',
      password: 'segredo',
      photo: null,
    });
  });
});
