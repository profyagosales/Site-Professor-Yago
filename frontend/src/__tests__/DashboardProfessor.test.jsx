jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardProfessor from '../pages/DashboardProfessor';
import axios from 'axios';

jest.mock('../components/NotificationsPanel', () => () => <div />);
jest.mock('../components/SendEmailModal', () => () => <div />);

describe('DashboardProfessor', () => {
  test('renders dashboard metrics', async () => {
    axios.get.mockResolvedValue({ data: { evaluations: [1,2], schedules: [1], progress: 25 } });
    require('react-router-dom').useNavigate.mockReturnValue(jest.fn());

    render(
      <MemoryRouter>
        <DashboardProfessor />
      </MemoryRouter>
    );

    expect(await screen.findByText('2 agendadas')).toBeInTheDocument();
    expect(screen.getByText('1 próximos')).toBeInTheDocument();
    expect(screen.getByText('25% concluído')).toBeInTheDocument();
  });
});
