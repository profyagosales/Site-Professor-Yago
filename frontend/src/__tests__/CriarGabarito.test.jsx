jest.mock('@/lib/http');
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CriarGabarito from '@/pages/CriarGabarito';

jest.mock('@/services/gabaritos', () => ({ createGabarito: jest.fn().mockResolvedValue({}) }));
jest.mock('pdf-lib', () => ({
  PDFDocument: { create: () => Promise.resolve({ addPage: () => ({ drawText: jest.fn(), drawImage: jest.fn() }), embedFont: jest.fn().mockResolvedValue({}), save: () => Promise.resolve(new Uint8Array()) }) },
  rgb: () => {},
  StandardFonts: { Helvetica: 'Helvetica' }
}));
const { createGabarito } = require('@/services/gabaritos');

describe('CriarGabarito', () => {
  test('submits gabarito', async () => {
    render(<CriarGabarito />);

    await userEvent.type(screen.getByPlaceholderText('Nome da Escola'), 'Escola');
    await userEvent.type(screen.getByPlaceholderText('Disciplina'), 'Matemática');
    await userEvent.type(screen.getByPlaceholderText('Professor'), 'Prof. X');
    await userEvent.click(screen.getByRole('button', { name: /Gerar PDF/i }));

    await waitFor(() => expect(createGabarito).toHaveBeenCalled());
  });
});
