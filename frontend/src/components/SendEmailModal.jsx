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
  const [copyTeachers, setCopyTeachers] = useState(false);
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
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject) {
      toast.error('Informe o assunto do e-mail.');
      setAlert({ type: 'error', text: 'Informe o assunto do e-mail.' });
      return;
    }

    if (!trimmedMessage) {
      toast.error('Informe a mensagem do e-mail.');
      setAlert({ type: 'error', text: 'Informe a mensagem do e-mail.' });
      return;
    }

    const classIds = [];
    const manualEmails = [];

    recipients.forEach((value) => {
      if (typeof value !== 'string') return;
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.includes('@')) {
        manualEmails.push(trimmed);
      } else {
        classIds.push(trimmed);
      }
    });

    if (classIds.length === 0 && manualEmails.length === 0) {
      toast.error('Selecione ao menos uma turma ou e-mail.');
      setAlert({ type: 'error', text: 'Selecione ao menos uma turma ou e-mail.' });
      return;
    }

    try {
      const result = await sendEmail({
        classIds: Array.from(new Set(classIds)),
        emails: Array.from(new Set(manualEmails)),
        subject: trimmedSubject,
        html: trimmedMessage,
        copyTeachers,
      });

      const sent = Number(result?.sent ?? 0);
      const successMessage = sent > 0
        ? `E-mail enviado para ${sent} destinatário(s).`
        : 'E-mail enviado com sucesso.';

      setAlert({ type: 'success', text: successMessage });
      setRecipients([]);
      setSubject('');
      setMessage('');
      setCopyTeachers(false);
      onClose();
      loadRecipients();
      toast.success(successMessage);
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
              {arrify(classes).map((cls) => {
                const classId = cls.classId || cls.id || cls._id;
                if (!classId) return null;
                const labelParts = [cls.series ? `${cls.series}` : null, cls.letter ? cls.letter : null]
                  .filter(Boolean)
                  .join('');
                const title = cls.discipline || cls.subject || 'Turma';
                return (
                  <option key={classId} value={classId}>
                    Turma {labelParts || classId} - {title}
                  </option>
                );
              })}
              {arrify(students).map((st) => (
                <option key={st._id || st.id || st.email} value={st.email}>
                  {st.name} ({st.email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Selecione turmas (IDs) e/ou e-mails individuais. Use Ctrl/Cmd para múltiplos itens.
            </p>
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
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={copyTeachers}
              onChange={(event) => setCopyTeachers(event.target.checked)}
            />
            Enviar também aos professores das turmas selecionadas
          </label>
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

