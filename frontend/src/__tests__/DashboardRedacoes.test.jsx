import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardRedacoes from '@/pages/DashboardRedacoes';
import { MemoryRouter } from 'react-router-dom';
import { listarPendentes, listarCorrigidas } from '@/services/redacoes';
import { gradeEssay } from '@/services/essays';

jest.mock('@/services/redacoes');
jest.mock('@/services/essays');

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardRedacoes />
    </MemoryRouter>
  );
}

describe('DashboardRedacoes', () => {
  beforeEach(() => {
    listarPendentes.mockResolvedValue({ redacoes: [] });
    listarCorrigidas.mockResolvedValue({ redacoes: [] });
    gradeEssay.mockResolvedValue({});
  });

  it('renders with empty lists', async () => {
    renderPage();
    expect(await screen.findByText('Pendentes')).toBeInTheDocument();
  });

  it('renders one item and grades', async () => {
    listarPendentes.mockResolvedValueOnce({
      redacoes: [
        {
          _id: '1',
          type: 'ENEM',
          student: { name: 'Aluno', photo: '' },
          class: { series: 1, letter: 'A' },
          submittedAt: new Date().toISOString(),
        },
      ],
    });
    renderPage();
    const btn = await screen.findByText('Corrigir');
    fireEvent.click(btn);
    const enviar = await screen.findByText('Enviar');
    fireEvent.click(enviar);
    await waitFor(() => expect(gradeEssay).toHaveBeenCalled());
  });
});
