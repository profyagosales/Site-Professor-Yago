jest.mock('@api');
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentModal from '../components/StudentModal';

describe('StudentModal', () => {
  test('submits student data', async () => {
    const onSubmit = jest.fn();
    render(
      <StudentModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />
    );

    const number = screen.getByText('Número').parentElement.querySelector('input');
    const name = screen.getByText('Nome').parentElement.querySelector('input');
    const email = screen.getByText('E-mail').parentElement.querySelector('input');

    await userEvent.type(number, '1');
    await userEvent.type(name, 'João');
    await userEvent.type(email, 'joao@example.com');
    await userEvent.click(screen.getByRole('button', { name: /Criar/i }));

    expect(onSubmit).toHaveBeenCalledWith({ number: 1, name: 'João', email: 'joao@example.com', photo: null });
  });
});
