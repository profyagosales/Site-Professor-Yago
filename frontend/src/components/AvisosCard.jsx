import { useEffect, useState } from 'react';
import { listClasses } from '@/services/classes';
import { createNotification } from '@/services/notifications';
import { toArray } from '@/lib/api';
import { toast } from 'react-toastify';

function AvisosCard() {
  const [classes, setClasses] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [extraEmail, setExtraEmail] = useState('');
  const [mode, setMode] = useState('now');
  const [runAt, setRunAt] = useState('');

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  const loadClasses = async () => {
    try {
      const cls = await listClasses();
      setClasses(arrify(cls));
    } catch (err) {
      console.error('Erro ao carregar turmas', err);
      toast.error(err.response?.data?.message ?? 'Erro ao carregar turmas');
    }
  };

  useEffect(() => {
    loadClasses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClassesChange = (e) => {
    const values = Array.from(e.target.selectedOptions).map((o) => o.value);
    setSelectedClasses(values);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        message,
        sendAt: mode === 'schedule' ? runAt : null,
        classIds: selectedClasses,
        emails: extraEmail ? [extraEmail] : [],
      };
      await createNotification(payload);
      toast.success(mode === 'now' ? 'Aviso enviado' : 'Aviso agendado');
      setMessage('');
      setSelectedClasses([]);
      setExtraEmail('');
      setRunAt('');
      setMode('now');
    } catch (err) {
      console.error('Erro ao enviar aviso', err);
      toast.error(err.response?.data?.message ?? 'Erro ao enviar aviso');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ys-card p-md space-y-md">
      <h2 className="text-orange font-semibold">Avisos</h2>
      <div>
        <label className="block mb-1" htmlFor="notice-message">Mensagem</label>
        <textarea
          id="notice-message"
          className="w-full border p-sm rounded"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block mb-1" htmlFor="notice-classes">Turmas</label>
        <select
          id="notice-classes"
          multiple
          className="w-full border p-sm rounded"
          value={selectedClasses}
          onChange={handleClassesChange}
        >
          {arrify(classes).map((cls) => (
            <option key={cls.classId} value={cls.classId}>
              Turma {cls.series}{cls.letter} - {cls.discipline}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1" htmlFor="notice-extra">Email adicional (opcional)</label>
        <input
          id="notice-extra"
          type="email"
          className="w-full border p-sm rounded"
          value={extraEmail}
          onChange={(e) => setExtraEmail(e.target.value)}
        />
      </div>
      <div className="flex gap-md items-center">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="mode"
            value="now"
            checked={mode === 'now'}
            onChange={() => setMode('now')}
          />
          Enviar agora
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="mode"
            value="schedule"
            checked={mode === 'schedule'}
            onChange={() => setMode('schedule')}
          />
          Agendar
        </label>
      </div>
      {mode === 'schedule' && (
        <div>
          <label className="block mb-1" htmlFor="notice-date">
            Data e hora
          </label>
          <input
            id="notice-date"
            type="datetime-local"
            className="w-full border p-sm rounded"
            value={runAt}
            onChange={(e) => setRunAt(e.target.value)}
            required
          />
        </div>
      )}
      <button type="submit" className="ys-btn-primary">
        {mode === 'now' ? 'Enviar' : 'Agendar'}
      </button>
    </form>
  );
}

export default AvisosCard;

