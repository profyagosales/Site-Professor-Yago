jest.mock('@api');
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CriarGabarito from '../pages/CriarGabarito';

jest.mock('../services/classes', () => ({ getClasses: jest.fn().mockResolvedValue([{ _id:'1', series:1, letter:'A', discipline:'Matemática' }]) }));
jest.mock('../services/gabaritos', () => ({ createGabarito: jest.fn().mockResolvedValue({}) }));
jest.mock('pdf-lib', () => ({
  PDFDocument: { create: () => Promise.resolve({ addPage: () => ({ drawText: jest.fn(), drawImage: jest.fn() }), embedFont: jest.fn().mockResolvedValue({}), save: () => Promise.resolve(new Uint8Array()) }) },
  rgb: () => {},
  StandardFonts: { Helvetica: 'Helvetica' }
}));
const { createGabarito } = require('../services/gabaritos');

describe('CriarGabarito', () => {
  test('submits gabarito', async () => {
    await act(async () => {
      render(
        <CriarGabarito />
      );
    });

    await userEvent.click(await screen.findByRole('button', { name: /Próximo/i }));
    await userEvent.click(await screen.findByLabelText(/1ªA - Matemática/));
    await userEvent.click(screen.getByRole('button', { name: /Próximo/i }));
    await userEvent.type(await screen.findByPlaceholderText('Número de questões'), '2');
    await userEvent.type(screen.getByPlaceholderText('Valor total da prova'), '10');
    await userEvent.type(screen.getByPlaceholderText('Gabarito (ex: A,B,C...)'), 'A,B');
    await userEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => expect(createGabarito).toHaveBeenCalled());
  });
});
