jest.mock('@/lib/http');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardProfessor from '@/pages/DashboardProfessor';
import { api, pickData, toArray } from '@/lib/http';

jest.mock('@/components/AvisosCard', () => () => <div />);
jest.mock('@/components/SendEmailModal', () => () => <div />);
jest.mock('@/components/NewContentModal', () => () => <div />);
jest.mock('@/components/NewEvaluationModal', () => () => <div />);
jest.mock('@/services/classes', () => ({
  listClasses: jest.fn().mockResolvedValue([
    { classId: '1', series: '1', letter: 'A', discipline: 'Mat' },
  ]),
}));

describe('DashboardProfessor', () => {
  test('renders dashboard sections', async () => {
    api.get.mockResolvedValue({ data: { contentProgress: [{ classId: '1', completion: 30 }] } });
    require('react-router-dom').useNavigate.mockReturnValue(jest.fn());

    render(
      <MemoryRouter>
        <DashboardProfessor />
      </MemoryRouter>
    );

    expect(await screen.findByText('Próximos conteúdos')).toBeInTheDocument();
    expect(await screen.findByText('Próximas Avaliações')).toBeInTheDocument();
    expect(await screen.findByText('Avisos recentes')).toBeInTheDocument();
  });
});
