import { useEffect, useState } from 'react';

function SchedulePicker({ value = [], onChange }) {
  const [items, setItems] = useState(value);

  useEffect(() => {
    setItems(value);
  }, [value]);

  const update = (updated) => {
    setItems(updated);
    if (onChange) onChange(updated);
  };

  const handleChange = (index, field, val) => {
    const updated = items.slice();
    updated[index] = { ...updated[index], [field]: val };
    update(updated);
  };

  const addItem = () => {
    update([...items, { day: '', slot: '' }]);
  };

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    update(updated);
  };

  return (
    <div>
      {items.map((s, idx) => (
        <div key={idx} className="flex items-center gap-sm mb-sm">
          <select
            aria-label="Dia"
            className="border p-sm rounded"
            value={s.day}
            onChange={(e) => handleChange(idx, 'day', e.target.value)}
          >
            <option value="">Dia</option>
            <option value="1">Segunda</option>
            <option value="2">Terça</option>
            <option value="3">Quarta</option>
            <option value="4">Quinta</option>
            <option value="5">Sexta</option>
          </select>
          <input
            type="number"
            aria-label="Slot"
            className="border p-sm rounded w-24"
            value={s.slot}
            onChange={(e) => handleChange(idx, 'slot', e.target.value)}
          />
          <button
            type="button"
            className="text-red-600"
            onClick={() => removeItem(idx)}
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        className="px-3 py-1 border rounded"
        onClick={addItem}
      >
        Adicionar Horário
      </button>
    </div>
  );
}

export default SchedulePicker;

