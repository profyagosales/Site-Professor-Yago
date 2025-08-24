import { render, screen } from '@testing-library/react';
import TurmaAlunos from '@/pages/professor/TurmaAlunos';

describe('TurmaAlunosPage', () => {
  test('renders table with students', () => {
    render(<TurmaAlunos />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@ex.com')).toBeInTheDocument();
  });
});

