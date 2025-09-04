import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardRedacoes from '@/pages/redacao/DashboardRedacoes';
import { MemoryRouter } from 'react-router-dom';
import { listarPendentes, listarCorrigidas } from '@/services/redacoes';
import * as essaysService from '@/services/essays.service';
import { api } from '@/services/api';

jest.mock('@/services/api', () => {
  const put = jest.fn();
  const get = jest.fn();
  const post = jest.fn();
  const del = jest.fn();
  return {
    api: { get, post, put, delete: del },
    setAuthToken: jest.fn(),
  };
});
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
    await userEvent.click(btn);
    const enviar = await screen.findByText('Enviar');
    await userEvent.click(enviar);
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
    await userEvent.click(tab);
    const emailBtn = await screen.findByText('Enviar por e-mail');
    await userEvent.click(emailBtn);
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
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /editar/i }));
    const themeInput = await screen.findByPlaceholderText('Buscar tema...');
    await userEvent.clear(themeInput);
    await userEvent.type(themeInput, 'Novo Tema');

    api.put.mockResolvedValueOnce({ data: { _id: '1', theme: { name: 'Novo Tema' } } });

    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledTimes(1);
      expect(api.put).toHaveBeenCalledWith('/essays/1', expect.objectContaining({
        theme: expect.anything(),
      }));
    });

    expect(await screen.findByText('Novo Tema')).toBeInTheDocument();
  });
});
