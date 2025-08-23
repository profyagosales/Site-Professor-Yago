jest.mock('@/lib/api');
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import SchedulePicker from '@/components/SchedulePicker';

describe('SchedulePicker', () => {
  function Wrapper() {
    const [value, setValue] = useState({ day: '', slot: '', time: '' });
    return (
      <>
        <SchedulePicker value={value} onChange={setValue} />
        <div data-testid="value">{JSON.stringify(value)}</div>
      </>
    );
  }

  test('renders and updates values', async () => {
    render(<Wrapper />);
    const day = screen.getByLabelText('Dia');
    const slot = screen.getByLabelText('Slot');
    await userEvent.selectOptions(day, 'SEGUNDA');
    await userEvent.selectOptions(slot, '2');
    expect(day.value).toBe('SEGUNDA');
    expect(slot.value).toBe('2');
    const value = JSON.parse(screen.getByTestId('value').textContent);
    expect(value.time).toBe('09:00');
  });
});
