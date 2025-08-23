import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardAluno from '@/pages/DashboardAluno';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('@/services/student', () => ({
  getStudentProfile: jest.fn().mockResolvedValue({ id: 1, name: 'Aluno', className: '1A' }),
  getStudentWeeklySchedule: jest.fn().mockResolvedValue([]),
  listStudentUpcomingExams: jest.fn().mockResolvedValue([]),
  listStudentUpcomingContents: jest.fn().mockResolvedValue([]),
  listStudentAnnouncements: jest.fn().mockResolvedValue([]),
  getStudentNotebookSummary: jest.fn().mockResolvedValue(null),
  getStudentGrades: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/components/EnviarRedacaoModal', () => () => <div />);
jest.mock('@/services/redacoes', () => ({ listarRedacoesAluno: jest.fn().mockResolvedValue([{ id:1, date:'2024-01-01', status:'Enviado' }]) }));

describe('DashboardAluno', () => {
  test('shows dashboard sections', async () => {
    localStorage.setItem('role', 'student');
    const navigate = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigate);
    render(
      <MemoryRouter>
        <DashboardAluno />
      </MemoryRouter>
    );

    expect(await screen.findByText('Próximas avaliações')).toBeInTheDocument();
    expect(screen.getByText('Próximos conteúdos')).toBeInTheDocument();
    expect(screen.getByText('Avisos')).toBeInTheDocument();
  });
});
