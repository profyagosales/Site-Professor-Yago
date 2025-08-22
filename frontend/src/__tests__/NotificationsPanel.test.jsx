jest.mock('@api');
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationsPanel from '@/components/NotificationsPanel';

jest.mock('@/services/notifications', () => ({
  getNotifications: jest.fn().mockResolvedValue([{ id:1, message:'Oi', nextRun: new Date().toISOString() }]),
  scheduleNotification: jest.fn().mockResolvedValue({})
}));
const { getNotifications, scheduleNotification } = require('@/services/notifications');

describe('NotificationsPanel', () => {
  test('loads and schedules notifications', async () => {
    render(<NotificationsPanel />);
    expect(await screen.findByText('Oi')).toBeInTheDocument();

    const messageInput = screen.getByText('Mensagem').parentElement.querySelector('textarea');
    const dateInput = screen.getByText('Data e hora').parentElement.querySelector('input');
    const targetsInput = screen.getByText('Destinatários (separados por vírgula)').parentElement.querySelector('input');

    await userEvent.type(messageInput, 'Hello');
    await userEvent.type(dateInput, '2025-01-01T00:00');
    await userEvent.type(targetsInput, 'a,b');
    await userEvent.click(screen.getByRole('button', { name: /Agendar/i }));

    expect(scheduleNotification).toHaveBeenCalled();
    expect(getNotifications).toHaveBeenCalled();
  });
});
