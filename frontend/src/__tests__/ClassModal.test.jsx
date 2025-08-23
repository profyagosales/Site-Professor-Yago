jest.mock('@api');
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClassModal from '@/components/ClassModal';

describe('ClassModal', () => {
  test('submits class data', async () => {
    const onSubmit = jest.fn();
    render(
      <ClassModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />
    );

    const serie = screen.getByText('Série').parentElement.querySelector('select');
    const letra = screen.getByText('Letra').parentElement.querySelector('input');
    const disciplina = screen.getByText('Disciplina').parentElement.querySelector('input');

    await userEvent.selectOptions(serie, '1');
    await userEvent.type(letra, 'A');
    await userEvent.type(disciplina, 'Matemática');
    await userEvent.selectOptions(screen.getByLabelText('Dia'), 'SEGUNDA');
    await userEvent.type(screen.getByLabelText('Slot'), '2');
    await userEvent.click(screen.getByRole('button', { name: /Criar/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      series: 1,
      letter: 'A',
      discipline: 'Matemática',
      schedule: { day: 'SEGUNDA', slot: 2 },
    });
  });
});
