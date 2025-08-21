import { useEffect, useState } from 'react';
import api from '@api';
import { asArray } from '@/utils/safe';

function SendEmailModal({ isOpen, onClose }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchRecipients = async () => {
      try {
        const [classRes, studentRes] = await Promise.all([
          api.get('/dashboard/teacher'),
          api.get('/students').catch(() => ({ data: [] }))
        ]);
        setClasses(asArray(classRes.data.contentProgress));
        setStudents(asArray(studentRes.data));
      } catch (err) {
        console.error('Erro ao carregar destinatários', err);
      }
    };
    fetchRecipients();
  }, [isOpen]);

  const handleChange = (e) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setRecipients(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/email/send', {
        to: recipients,
        subject,
        html: message,
      });
      setAlert({ type: 'success', text: 'E-mail enviado com sucesso.' });
      setRecipients([]);
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', text: 'Erro ao enviar e-mail.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-lg p-md">
        <h2 className="text-xl">Enviar E-mail</h2>
        {alert && (
          <div
            className={`mb-md p-sm rounded ${
              alert.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {alert.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <label className="block mb-1">Destinatários</label>
            <select
              multiple
              className="w-full border p-sm rounded"
              value={recipients}
              onChange={handleChange}
            >
              {classes.map((cls) => (
                <option key={cls.classId} value={cls.classId}>
                  Turma {cls.series}{cls.letter} - {cls.discipline}
                </option>
              ))}
              {students.map((st) => (
                <option key={st._id} value={st.email}>
                  {st.name} ({st.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1">Assunto</label>
            <input
              type="text"
              className="w-full border p-sm rounded"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">Mensagem (HTML)</label>
            <textarea
              className="w-full border p-sm rounded h-40"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SendEmailModal;

