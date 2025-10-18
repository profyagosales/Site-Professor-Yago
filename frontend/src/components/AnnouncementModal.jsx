import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { listClasses } from '@/services/classes'
import { createAnnouncement } from '@/services/announcements'
import { toArray } from '@/lib/api'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const EMAIL_SPLIT_REGEX = /[,;\n]+/

const toId = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value._id) return String(value._id)
  if (value.id) return String(value.id)
  if (value.classId) return String(value.classId)
  return ''
}

export default function AnnouncementModal({ open, onClose, onSaved }) {
  const [classes, setClasses] = useState([])
  const [message, setMessage] = useState('')
  const [selectedClasses, setSelectedClasses] = useState([])
  const [emailList, setEmailList] = useState('')
  const [includeTeachers, setIncludeTeachers] = useState(false)
  const [targetMode, setTargetMode] = useState('class')
  const [sendMode, setSendMode] = useState('now')
  const [scheduleAt, setScheduleAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    listClasses()
      .then((response) => {
        const entries = toArray(response)
        setClasses(entries)
      })
      .catch(() => {
    setClasses([])
      })
  }, [open])

  const availableClasses = useMemo(() => {
    return toArray(classes).map((klass) => {
      const id = toId(klass)
      const name = klass?.name || klass?.nome
      const gradePart = klass?.series ? `${klass.series}º${klass.letter ?? ''}`.trim() : ''
      const discipline = klass?.discipline || klass?.disciplina || klass?.subject || ''
      const fallback = [gradePart && `Turma ${gradePart}`, discipline].filter(Boolean).join(' • ')
      return {
        id,
        label: name || fallback || 'Turma',
        series: klass?.series,
        letter: klass?.letter,
        discipline,
      }
    })
  }, [classes])

  const handleClassSelection = (event) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value)
    setSelectedClasses(values)
  }

  const parsedEmails = useMemo(() => {
    return emailList
      .split(EMAIL_SPLIT_REGEX)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }, [emailList])

  const canSubmit = useMemo(() => {
    if (!message.trim()) return false
    if (targetMode === 'class') {
      return selectedClasses.length > 0
    }
    return parsedEmails.length > 0
  }, [message, parsedEmails.length, selectedClasses.length, targetMode])

  const resetState = () => {
    setMessage('')
    setSelectedClasses([])
    setEmailList('')
    setIncludeTeachers(false)
    setTargetMode('class')
    setSendMode('now')
    setScheduleAt('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const payload = {
        message: message.trim(),
        target:
          targetMode === 'class'
            ? { type: 'class', value: selectedClasses }
            : { type: 'email', value: parsedEmails },
        includeTeachers: targetMode === 'class' ? includeTeachers : false,
        scheduleAt: sendMode === 'schedule' && scheduleAt ? scheduleAt : null,
      }

      const response = await createAnnouncement(payload)
      toast.success('Aviso criado')
      if (response?.meta?.emailSent === false) {
        toast.warning('Aviso criado; e-mail pendente (ver logs)')
      }
      onSaved?.()
      onClose()
      resetState()
    } catch (err) {
      console.error('[AnnouncementModal] Falha ao criar aviso', err)
      toast.error('Erro ao criar aviso')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { if (!submitting) { onClose(); resetState() } }}>
      <div className="w-full max-w-xl p-6">
        <h2 className="text-xl font-semibold text-slate-900">Adicionar aviso</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mensagem</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="target"
                value="class"
                checked={targetMode === 'class'}
                onChange={() => setTargetMode('class')}
              />
              Enviar para turmas
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="target"
                value="email"
                checked={targetMode === 'email'}
                onChange={() => setTargetMode('email')}
              />
              Enviar para e-mails
            </label>
          </div>

          {targetMode === 'class' ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Turmas</label>
                <select
                  multiple
                  className="h-36 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  value={selectedClasses}
                  onChange={handleClassSelection}
                  required
                >
                  {availableClasses.map((klass) => (
                    <option key={klass.id} value={klass.id}>
                      {klass.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={includeTeachers}
                  onChange={(event) => setIncludeTeachers(event.target.checked)}
                />
                Incluir professores das turmas em cópia oculta
              </label>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                E-mails (separe com vírgula ou quebra de linha)
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={emailList}
                onChange={(event) => setEmailList(event.target.value)}
                rows={3}
                required
              />
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="send-mode"
                value="now"
                checked={sendMode === 'now'}
                onChange={() => setSendMode('now')}
              />
              Enviar agora
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="send-mode"
                value="schedule"
                checked={sendMode === 'schedule'}
                onChange={() => setSendMode('schedule')}
              />
              Agendar envio
            </label>
          </div>

          {sendMode === 'schedule' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Data e hora</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
                required
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => { if (!submitting) { onClose(); resetState() } }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? 'Enviando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
