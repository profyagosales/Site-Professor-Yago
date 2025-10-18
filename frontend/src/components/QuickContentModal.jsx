import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { listClasses } from '@/services/classes'
import { quickCreateContent } from '@/services/contents'
import { toArray } from '@/lib/api'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const toId = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value._id) return String(value._id)
  if (value.id) return String(value.id)
  if (value.classId) return String(value.classId)
  return ''
}

export default function QuickContentModal({ open, onClose, onSaved }) {
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [term, setTerm] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [done, setDone] = useState(false)

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : []
  }

  useEffect(() => {
    if(open){
      listClasses().then(res => setClasses(arrify(res))).catch(() => {})
    }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await quickCreateContent({ classId, term: Number(term), title, description, date, done })
      toast.success('Conteúdo criado')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('contents:refresh'))
      }
      onClose()
      onSaved && onSaved()
      setClassId(''); setTerm(''); setTitle(''); setDescription(''); setDate(''); setDone(false)
    } catch(err){
      toast.error('Erro ao criar conteúdo')
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-slate-800">Adicionar conteúdo</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Turma</label>
            <select className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={classId} onChange={e=>setClassId(e.target.value)} required>
              <option value="">Selecione</option>
              {arrify(classes).map(cls => {
                const id = toId(cls)
                const name = cls?.name || cls?.nome
                const gradePart = cls?.series ? `${cls.series}º${cls.letter ?? ''}`.trim() : ''
                const discipline = cls?.discipline || cls?.subject || ''
                const fallback = [gradePart && `Turma ${gradePart}`, discipline].filter(Boolean).join(' - ')
                const label = name || fallback || 'Turma'
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Bimestre</label>
              <input type="number" min="1" max="4" className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={term} onChange={e=>setTerm(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Data</label>
              <input type="date" className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={date} onChange={e=>setDate(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Título</label>
            <input type="text" className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={title} onChange={e=>setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Descrição</label>
            <textarea className="w-full rounded-xl border border-slate-200 p-2 text-sm" value={description} onChange={e=>setDescription(e.target.value)} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={done} onChange={e=>setDone(e.target.checked)} /> Concluído?
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
