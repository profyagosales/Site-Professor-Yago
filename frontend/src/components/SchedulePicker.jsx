const slotTimes = {
  1: '07:00',
  2: '09:00',
  3: '11:00',
};

function SchedulePicker({ value = { day: '', slot: '', time: '' }, onChange }) {
  const handleChange = (field, val) => {
    const updated = { ...value, [field]: val };
    if (field === 'slot') {
      updated.time = slotTimes[val] || '';
    }
    if (onChange) onChange(updated);
  };

  return (
    <div className='flex items-center gap-sm'>
      <select
        aria-label='Dia'
        className='border p-sm rounded'
        value={value.day}
        onChange={e => handleChange('day', e.target.value)}
      >
        <option value=''>Dia</option>
        <option value='SEGUNDA'>Segunda</option>
        <option value='TERCA'>Terça</option>
        <option value='QUARTA'>Quarta</option>
        <option value='QUINTA'>Quinta</option>
        <option value='SEXTA'>Sexta</option>
      </select>
      <select
        aria-label='Slot'
        className='border p-sm rounded w-24'
        value={value.slot}
        onChange={e => handleChange('slot', e.target.value)}
      >
        <option value=''>Slot</option>
        <option value='1'>1</option>
        <option value='2'>2</option>
        <option value='3'>3</option>
      </select>
    </div>
  );
}

export default SchedulePicker;
