import { useEffect, useState } from 'react';
import { listClasses } from '@/services/classes';
import { 
  createAnnouncement, 
  validateAnnouncement, 
  getPriorityOptions,
  formatPublishDate 
} from '@/services/announcements';
import { toArray } from '@/services/api';
import { toast } from 'react-toastify';

export default function AnnouncementModal({ open, onClose, onSaved, editingAnnouncement = null }) {
  const [classes, setClasses] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState([]);
  const [priority, setPriority] = useState('normal');
  const [mode, setMode] = useState('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);

  const arrify = v => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  useEffect(() => {
    if (open) {
      listClasses()
        .then(res => setClasses(arrify(res)))
        .catch(() => {});
      
      // Se está editando, preencher os campos
      if (editingAnnouncement) {
        setTitle(editingAnnouncement.title || '');
        setMessage(editingAnnouncement.message || '');
        setSelected(editingAnnouncement.classIds || []);
        setPriority(editingAnnouncement.priority || 'normal');
        
        if (editingAnnouncement.publishAt) {
          const publishDate = new Date(editingAnnouncement.publishAt);
          const now = new Date();
          
          if (publishDate > now) {
            setMode('schedule');
            setScheduledAt(publishDate.toISOString().slice(0, 16));
          } else {
            setMode('now');
          }
        } else {
          setMode('now');
        }
      } else {
        // Reset form for new announcement
        setTitle('');
        setMessage('');
        setSelected([]);
        setPriority('normal');
        setMode('now');
        setScheduledAt('');
      }
    }
  }, [open, editingAnnouncement]);

  const handleClassesChange = e => {
    const values = Array.from(e.target.selectedOptions).map(o => o.value);
    setSelected(values);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    // Validação
    const formData = {
      title,
      message,
      classIds: selected,
      publishAt: mode === 'schedule' ? scheduledAt : undefined,
      priority
    };
    
    const validation = validateAnnouncement(formData);
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }
    
    setLoading(true);
    try {
      if (editingAnnouncement) {
        // Atualizar aviso existente
        const { updateAnnouncement } = await import('@/services/announcements');
        await updateAnnouncement(editingAnnouncement.id, formData);
        toast.success('Aviso atualizado com sucesso');
      } else {
        // Criar novo aviso
        await createAnnouncement(formData);
        toast.success('Aviso criado com sucesso');
      }
      
      onClose();
      onSaved && onSaved();
    } catch (err) {
      console.error('Erro ao salvar aviso:', err);
      const message = err?.response?.data?.message || 'Erro ao salvar aviso';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const priorityOptions = getPriorityOptions();

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black/50'>
      <div className='ys-card w-full max-w-lg p-md'>
        <h2 className='text-xl mb-md'>
          {editingAnnouncement ? 'Editar aviso' : 'Adicionar aviso'}
        </h2>
        <form onSubmit={handleSubmit} className='space-y-md'>
          <div>
            <label className='block mb-1'>Título *</label>
            <input
              type='text'
              className='w-full border p-sm rounded'
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='Digite o título do aviso'
              required
              maxLength={200}
            />
            <div className='text-xs text-gray-500 mt-1'>
              {title.length}/200 caracteres
            </div>
          </div>
          <div>
            <label className='block mb-1'>Mensagem *</label>
            <textarea
              className='w-full border p-sm rounded'
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder='Digite a mensagem do aviso'
              required
              rows={4}
              maxLength={2000}
            />
            <div className='text-xs text-gray-500 mt-1'>
              {message.length}/2000 caracteres
            </div>
          </div>
          <div>
            <label className='block mb-1'>Turmas *</label>
            <select
              multiple
              className='w-full border p-sm rounded'
              value={selected}
              onChange={handleClassesChange}
              required
            >
              {arrify(classes).map(cls => (
                <option key={cls.id || cls.classId} value={cls.id || cls.classId}>
                  {cls.series}º {cls.letter} - {cls.discipline}
                </option>
              ))}
            </select>
            <div className='text-xs text-gray-500 mt-1'>
              Segure Ctrl/Cmd para selecionar múltiplas turmas
            </div>
          </div>
          <div>
            <label className='block mb-1'>Prioridade</label>
            <select
              className='w-full border p-sm rounded'
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className='flex gap-md items-center'>
            <label className='flex items-center gap-1'>
              <input
                type='radio'
                name='mode'
                value='now'
                checked={mode === 'now'}
                onChange={() => setMode('now')}
              />
              Publicar agora
            </label>
            <label className='flex items-center gap-1'>
              <input
                type='radio'
                name='mode'
                value='schedule'
                checked={mode === 'schedule'}
                onChange={() => setMode('schedule')}
              />
              Agendar publicação
            </label>
          </div>
          {mode === 'schedule' && (
            <div>
              <label className='block mb-1'>Data e hora de publicação</label>
              <input
                type='datetime-local'
                className='w-full border p-sm rounded'
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
              <div className='text-xs text-gray-500 mt-1'>
                O aviso será publicado automaticamente na data e hora selecionadas
              </div>
            </div>
          )}
          <div className='flex justify-end gap-sm pt-sm'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 border rounded'
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type='submit' 
              className='ys-btn-primary'
              disabled={loading}
            >
              {loading ? 'Salvando...' : (editingAnnouncement ? 'Atualizar' : 'Salvar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
