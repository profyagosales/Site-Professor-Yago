function SchedulePicker({ value = { day: '', slot: '' }, onChange }) {
  const handleChange = (field, val) => {
    const updated = { ...value, [field]: val };
    if (onChange) onChange(updated);
  };

  return (
    <div className="flex items-center gap-sm">
      <select
        aria-label="Dia"
        className="border p-sm rounded"
        value={value.day}
        onChange={(e) => handleChange('day', e.target.value)}
      >
        <option value="">Dia</option>
        <option value="SEGUNDA">Segunda</option>
        <option value="TERCA">Terça</option>
        <option value="QUARTA">Quarta</option>
        <option value="QUINTA">Quinta</option>
        <option value="SEXTA">Sexta</option>
      </select>
      <input
        type="number"
        aria-label="Slot"
        className="border p-sm rounded w-24"
        value={value.slot}
        onChange={(e) => handleChange('slot', e.target.value)}
      />
    </div>
  );
}

export default SchedulePicker;

