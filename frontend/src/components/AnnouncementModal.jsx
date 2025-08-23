import { useEffect, useState } from 'react'
import { listClasses } from '@/services/classes'
import { createAnnouncement } from '@/services/announcements'
import { toArray } from '@/lib/api'
import { toast } from 'react-toastify'

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

  if(!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-lg p-md">
        <h2 className="text-xl mb-md">Adicionar aviso</h2>
        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <label className="block mb-1">Mensagem</label>
            <textarea className="w-full border p-sm rounded" value={message} onChange={e=>setMessage(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">Turmas</label>
            <select multiple className="w-full border p-sm rounded" value={selected} onChange={handleClassesChange}>
              {arrify(classes).map(cls => (
                <option key={cls.classId} value={cls.classId}>Turma {cls.series}{cls.letter} - {cls.discipline}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1">Email adicional (opcional)</label>
            <input type="email" className="w-full border p-sm rounded" value={extraEmail} onChange={e=>setExtraEmail(e.target.value)} />
          </div>
          <div className="flex gap-md items-center">
            <label className="flex items-center gap-1">
              <input type="radio" name="mode" value="now" checked={mode==='now'} onChange={()=>setMode('now')} />
              Enviar agora
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="mode" value="schedule" checked={mode==='schedule'} onChange={()=>setMode('schedule')} />
              Agendar
            </label>
          </div>
          {mode==='schedule' && (
            <div>
              <label className="block mb-1">Data e hora</label>
              <input type="datetime-local" className="w-full border p-sm rounded" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} required />
            </div>
          )}
          <div className="flex justify-end gap-sm pt-sm">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
