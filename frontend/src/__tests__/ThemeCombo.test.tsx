import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeCombo from '@/components/redacao/ThemeCombo';
import { Themes } from '@/services/api';

jest.mock('@/services/api', () => ({
  Themes: {
    list: jest.fn(),
    create: jest.fn(),
  },
}));

describe('ThemeCombo', () => {
  beforeEach(() => {
    (Themes.list as any).mockResolvedValue([]);
    (Themes.create as any).mockResolvedValue({ id: '1', name: 'Novo' });
  });

  it('creates new theme when none found', async () => {
    const onChange = jest.fn();
    render(<ThemeCombo allowCreate onChange={onChange} />);
    const input = screen.getByPlaceholderText('Buscar tema...');
    await userEvent.type(input, 'Novo');
    await new Promise((r) => setTimeout(r, 300));
    const createBtn = await screen.findByText("+ Criar tema 'Novo'");
    await userEvent.click(createBtn);
    await waitFor(() => expect(Themes.create).toHaveBeenCalledWith('Novo'));
    expect(onChange).toHaveBeenCalledWith({ id: '1', name: 'Novo' });
  });
});
