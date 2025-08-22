jest.mock('@api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardProfessor from '@/pages/DashboardProfessor';
import api, { pickData, toArray } from '@api';

jest.mock('@/components/NotificationsPanel', () => () => <div />);
jest.mock('@/components/SendEmailModal', () => () => <div />);

describe('DashboardProfessor', () => {
  test('renders dashboard metrics', async () => {
    api.get.mockResolvedValue({
      data: { evaluations: [1, 2], schedules: [1], progress: 25 },
    });
    require('react-router-dom').useNavigate.mockReturnValue(jest.fn());

    render(
      <MemoryRouter>
        <DashboardProfessor />
      </MemoryRouter>
    );

    expect(await screen.findByText('Próximas Avaliações')).toBeInTheDocument();
    expect(screen.getByText('2 agendadas')).toBeInTheDocument();
    expect(screen.getByText('Horários de Aula')).toBeInTheDocument();
    expect(screen.getByText('1 próximos')).toBeInTheDocument();
    expect(screen.getByText('Progresso do Conteúdo')).toBeInTheDocument();
    expect(screen.getByText('25% concluído')).toBeInTheDocument();
  });
});
