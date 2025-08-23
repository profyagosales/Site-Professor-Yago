jest.mock('@/lib/api');
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CorrigirRedacao from '@/pages/CorrigirRedacao';

jest.mock('@/services/redacoes', () => ({ corrigirRedacao: jest.fn() }));

describe('CorrigirRedacao', () => {
  test('changes fields by tipo', async () => {
    render(
      <MemoryRouter initialEntries={['/redacoes/1/corrigir']}>
        <Routes>
          <Route path="/redacoes/:id/corrigir" element={<CorrigirRedacao />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Condições de anulação')).toBeInTheDocument();
    const tipoSelect = screen.getByText('Tipo de correção').parentElement.querySelector('select');
    await userEvent.selectOptions(tipoSelect, 'PAS/UnB');
    const ncInput = screen.getByText('NC').parentElement.querySelector('input');
    expect(ncInput).toBeInTheDocument();
    expect(screen.queryByText('Condições de anulação')).not.toBeInTheDocument();
  });
});
