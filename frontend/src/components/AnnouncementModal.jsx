import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { listClasses } from '@/services/classes'
import { createAnnouncement } from '@/services/announcements'
import { toArray } from '@/lib/api'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export default function AnnouncementModal({ open, onClose, onSaved }) {
  const [classes, setClasses] = useState([])
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState([])
  const [extraEmail, setExtraEmail] = useState('')
  const [mode, setMode] = useState('now')
  const [scheduledAt, setScheduledAt] = useState('')

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : []
  }

  useEffect(() => {
    if(open){
      listClasses().then(res=>setClasses(arrify(res))).catch(()=>{})
    }
  }, [open])

  const handleClassesChange = (e) => {
    const values = Array.from(e.target.selectedOptions).map(o=>o.value)
    setSelected(values)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createAnnouncement({
        message,
        classIds: selected,
        sendNow: mode === 'now',
        scheduledAt: mode === 'schedule' ? scheduledAt : undefined,
        extraEmail: extraEmail || undefined,
      })
      toast.success('Aviso criado')
      onClose(); onSaved && onSaved();
      setMessage(''); setSelected([]); setExtraEmail(''); setMode('now'); setScheduledAt('')
    } catch(err){
      toast.error('Erro ao criar aviso')
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-slate-800">Adicionar aviso</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Mensagem</label>
            <textarea className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={message} onChange={e=>setMessage(e.target.value)} rows={4} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Turmas</label>
            <select multiple className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={selected} onChange={handleClassesChange}>
              {arrify(classes).map(cls => (
                <option key={cls.classId} value={cls.classId}>Turma {cls.series}{cls.letter} - {cls.discipline}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Email adicional (opcional)</label>
            <input type="email" className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={extraEmail} onChange={e=>setExtraEmail(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" value="now" checked={mode==='now'} onChange={()=>setMode('now')} />
              Enviar agora
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" value="schedule" checked={mode==='schedule'} onChange={()=>setMode('schedule')} />
              Agendar
            </label>
          </div>
          {mode==='schedule' && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Data e hora</label>
              <input type="datetime-local" className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} required />
            </div>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
