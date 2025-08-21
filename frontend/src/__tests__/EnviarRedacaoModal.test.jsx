jest.mock('@api');
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnviarRedacaoModal from '../components/EnviarRedacaoModal';

jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../services/redacoes', () => ({ enviarRedacao: jest.fn().mockResolvedValue({}) }));
const { enviarRedacao } = require('../services/redacoes');

describe('EnviarRedacaoModal', () => {
  test('uploads file', async () => {
    global.URL.createObjectURL = jest.fn(() => 'preview');
    global.URL.revokeObjectURL = jest.fn();
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const onSuccess = jest.fn();
    const { container } = render(
      <EnviarRedacaoModal isOpen={true} onClose={() => {}} onSuccess={onSuccess} />
    );

    const input = container.querySelector('input[type="file"]');
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(enviarRedacao).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
