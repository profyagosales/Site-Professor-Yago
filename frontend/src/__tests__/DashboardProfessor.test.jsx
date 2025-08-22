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
    api.get.mockResolvedValue({ data: { evaluations: [], schedules: [], progress: 0 } });
    require('react-router-dom').useNavigate.mockReturnValue(jest.fn());

    render(
      <MemoryRouter>
        <DashboardProfessor />
      </MemoryRouter>
    );

    expect(await screen.findByText('Próximas Avaliações')).toBeInTheDocument();
    expect(await screen.findByText('0 agendadas')).toBeInTheDocument();
    expect(await screen.findByText('Horários de Aula')).toBeInTheDocument();
    expect(await screen.findByText('0 próximos')).toBeInTheDocument();
    expect(await screen.findByText('Progresso do Conteúdo')).toBeInTheDocument();
    expect(await screen.findByText('0% concluído')).toBeInTheDocument();
  });
});
