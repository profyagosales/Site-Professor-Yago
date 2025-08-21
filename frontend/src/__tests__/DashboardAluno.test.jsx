import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardAluno from '../pages/DashboardAluno';
import api from '@api';

jest.mock('@api');
jest.mock('../components/EnviarRedacaoModal', () => () => <div />);
jest.mock('../services/redacoes', () => ({ listarRedacoesAluno: jest.fn().mockResolvedValue([{ id:1, date:'2024-01-01', status:'Enviado' }]) }));

describe('DashboardAluno', () => {
  test('shows metrics and redações', async () => {
    api.get.mockResolvedValue({ data: { evaluations: [1], schedules: [1,2], progress: 50 } });

    render(
      <MemoryRouter>
        <DashboardAluno />
      </MemoryRouter>
    );

    expect(await screen.findByText('1 agendadas')).toBeInTheDocument();
    expect(screen.getByText('2 próximos')).toBeInTheDocument();
    expect(screen.getByText('50% concluído')).toBeInTheDocument();
    expect(await screen.findByText(/Enviado/)).toBeInTheDocument();
  });
});
