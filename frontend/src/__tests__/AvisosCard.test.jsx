jest.mock('@/lib/api');
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvisosCard from '@/components/AvisosCard';

jest.mock('@/services/classes', () => ({
  listClasses: jest.fn().mockResolvedValue([
    { classId: '1', series: '1', letter: 'A', discipline: 'Mat' },
  ]),
}));

jest.mock('@/services/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));

const { createNotification } = require('@/services/notifications');

describe('AvisosCard', () => {
  test('sends notice immediately', async () => {
    await act(async () => {
      render(<AvisosCard />);
    });
    const message = screen.getByLabelText('Mensagem');
    await userEvent.type(message, 'Oi');
    const select = await screen.findByLabelText('Turmas');
    await screen.findByText('Turma 1A - Mat');
    await userEvent.selectOptions(select, ['1']);
    const extra = screen.getByLabelText(/Email adicional/);
    await userEvent.type(extra, 'x@y.com');
    await userEvent.click(screen.getByRole('button', { name: /Enviar/i }));
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ sendAt: null })
    );
  });

  test('schedules notice', async () => {
    await act(async () => {
      render(<AvisosCard />);
    });
    const message = await screen.findByLabelText('Mensagem');
    await userEvent.type(message, 'Oi');
    const select = await screen.findByLabelText('Turmas');
    await screen.findByText('Turma 1A - Mat');
    await userEvent.selectOptions(select, ['1']);
    const radio = screen.getByLabelText('Agendar');
    await userEvent.click(radio);
    const date = screen.getByLabelText('Data e hora');
    await userEvent.type(date, '2025-01-01T00:00');
    await userEvent.click(screen.getByRole('button', { name: /Agendar/i }));
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ sendAt: '2025-01-01T00:00' })
    );
  });
});
