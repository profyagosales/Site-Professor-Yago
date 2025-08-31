import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardRedacoes from '@/pages/redacao/DashboardRedacoes';
import { MemoryRouter } from 'react-router-dom';
import { listarPendentes, listarCorrigidas } from '@/services/redacoes';
import * as essaysService from '@/services/essays.service';
import { api } from '@/lib/api';

jest.mock('@/lib/api');
jest.mock('@/services/redacoes');
jest.mock('@/services/essays.service');

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
    essaysService.gradeEssay.mockResolvedValue({});
    // eslint-disable-next-line no-import-assign
    essaysService.sendCorrectionEmail = jest.fn().mockResolvedValue({});
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
    await waitFor(() => expect(essaysService.gradeEssay).toHaveBeenCalled());
  });

  it('sends email and updates state', async () => {
    listarCorrigidas.mockResolvedValueOnce({
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
    const tab = await screen.findByText('Corrigidas');
    fireEvent.click(tab);
    const emailBtn = await screen.findByText('Enviar por e-mail');
    fireEvent.click(emailBtn);
    await waitFor(() => expect(essaysService.sendCorrectionEmail).toHaveBeenCalledWith('1'));
    expect(await screen.findByText('Enviado')).toBeInTheDocument();
    expect(await screen.findByText('Enviar novamente')).toBeInTheDocument();
  });

  it('updates item after editing', async () => {
    listarPendentes.mockResolvedValueOnce({
      redacoes: [
        {
          _id: '1',
          type: 'ENEM',
          student: { name: 'Aluno', photo: '' },
          class: { series: 1, letter: 'A' },
          submittedAt: new Date().toISOString(),
          theme: { name: 'Antigo' },
          fileUrl: 'file.pdf',
        },
      ],
    });
    api.put.mockResolvedValue({
      data: {
        _id: '1',
        student: { name: 'Aluno' },
        class: { series: 1, letter: 'A' },
        submittedAt: new Date().toISOString(),
        theme: { name: 'Novo Tema' },
        fileUrl: 'file.pdf',
      },
    });
    renderPage();
    const editBtn = await screen.findByLabelText('Editar');
    fireEvent.click(editBtn);
    const themeInput = await screen.findByPlaceholderText('Buscar tema...');
    await userEvent.clear(themeInput);
    await userEvent.type(themeInput, 'Novo Tema');
    const saveBtn = await screen.findByText('Salvar');
    fireEvent.click(saveBtn);
    await waitFor(() => expect(api.put).toHaveBeenCalled());
    expect(await screen.findByText('Novo Tema')).toBeInTheDocument();
  });
});
