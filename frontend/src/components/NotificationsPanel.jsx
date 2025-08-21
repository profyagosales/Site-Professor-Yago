import { useEffect, useState } from 'react';
import { getNotifications, scheduleNotification } from '@/services/notifications';
import { toArray } from '@/services/api';
import { toast } from 'react-toastify';

function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState('');
  const [runAt, setRunAt] = useState('');
  const [targets, setTargets] = useState('');

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(arrify(data));
    } catch (err) {
      console.error('Erro ao buscar notificações', err);
      toast.error(err.response?.data?.message ?? 'Erro ao buscar notificações');
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await scheduleNotification({
        message,
        runAt,
        targets: targets.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setMessage('');
      setRunAt('');
      setTargets('');
      loadNotifications();
    } catch (err) {
      console.error('Erro ao agendar notificação', err);
      toast.error(err.response?.data?.message ?? 'Erro ao agendar notificação');
    }
  };

  return (
    <div className="space-y-md">
      <form
        onSubmit={handleSubmit}
        className="card p-md space-y-md"
      >
        <h2 className="text-orange font-semibold">Agendar Notificação</h2>
        <div>
          <label className="block mb-1">Mensagem</label>
          <textarea
            className="w-full border p-sm rounded"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">Data e hora</label>
          <input
            type="datetime-local"
            className="w-full border p-sm rounded"
            value={runAt}
            onChange={(e) => setRunAt(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">Destinatários (separados por vírgula)</label>
          <input
            type="text"
            className="w-full border p-sm rounded"
            value={targets}
            onChange={(e) => setTargets(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary">
          Agendar
        </button>
      </form>
        <div className="space-y-sm">
          {arrify(notifications).map((n) => (
            <div
              key={n._id || n.id}
              className="card p-md"
            >
            <h3 className="text-orange font-semibold mb-sm">{n.message}</h3>
            <p className="text-sm text-black/70 mb-sm">
              Próxima execução: {new Date(n.nextRun).toLocaleString()}
            </p>
            <button className="btn-primary">Detalhes</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsPanel;

