import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toArray } from '@/lib/api';
import { listClasses } from '@/services/classes';
import { listStudents } from '@/services/students';
import { sendEmail } from '@/services/email';

function SendEmailModal({ isOpen, onClose }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [alert, setAlert] = useState(null);

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  const loadRecipients = async () => {
    try {
      const [classRes, studentRes] = await Promise.all([
        listClasses(),
        listStudents().catch(() => [])
      ]);
      setClasses(arrify(classRes));
      setStudents(arrify(studentRes));
    } catch (err) {
      console.error('Erro ao carregar destinatários', err);
      toast.error(err.response?.data?.message ?? 'Erro ao carregar destinatários');
    }
  };

  useEffect(() => {
    if (isOpen) loadRecipients();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setRecipients(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await sendEmail({
        to: recipients,
        subject,
        html: message,
      });
      setAlert({ type: 'success', text: 'E-mail enviado com sucesso.' });
      setRecipients([]);
      setSubject('');
      setMessage('');
      onClose();
      loadRecipients();
    } catch (err) {
      console.error(err);
      const messageErr = err.response?.data?.message ?? 'Erro ao enviar e-mail.';
      setAlert({ type: 'error', text: messageErr });
      toast.error(messageErr);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-slate-800">Enviar e-mail</h2>
        {alert && (
          <div
            className={`mt-3 rounded-xl p-3 text-sm ${
              alert.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {alert.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Destinatários</label>
            <select
              multiple
              className="h-40 w-full rounded-xl border border-slate-200 p-2 text-sm"
              value={recipients}
              onChange={handleChange}
            >
              {arrify(classes).map((cls) => (
                <option key={cls.classId} value={cls.classId}>
                  Turma {cls.series}{cls.letter} - {cls.discipline}
                </option>
              ))}
              {arrify(students).map((st) => (
                <option key={st._id} value={st.email}>
                  {st.name} ({st.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Assunto</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 p-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Mensagem (HTML)</label>
            <textarea
              className="h-48 w-full rounded-xl border border-slate-200 p-2 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Enviar</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default SendEmailModal;

