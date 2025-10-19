import { useEffect, useMemo, useRef, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { toast } from 'react-toastify'
import { listClasses } from '@/services/classes'
import { createAnnouncement, uploadAnnouncementImage } from '@/services/announcements'
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

const stripHtml = (value) => {
  if (!value) return ''
  const div = typeof window !== 'undefined' ? window.document.createElement('div') : null
  if (!div) {
    return value.replace(/<[^>]+>/g, ' ')
  }
  div.innerHTML = value
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim()
}

const sanitizeEmails = (rawList) => {
  return rawList
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((email) => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email))
}

export default function AnnouncementModal({ open, onClose, onSaved }) {
  const [classes, setClasses] = useState([])
  const [subject, setSubject] = useState('')
  const [editorValue, setEditorValue] = useState('')
  const [attachments, setAttachments] = useState([])
  const [selectedClasses, setSelectedClasses] = useState([])
  const [emailList, setEmailList] = useState('')
  const [bccTeachers, setBccTeachers] = useState(false)
  const [targetMode, setTargetMode] = useState('class')
  const [sendMode, setSendMode] = useState('now')
  const [scheduleAt, setScheduleAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const quillRef = useRef(null)

  useEffect(() => {
    if (!open) return
    listClasses()
      .then((response) => {
        const entries = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
        setClasses(entries)
      })
      .catch(() => setClasses([]))
  }, [open])

  const availableClasses = useMemo(() => {
    return (Array.isArray(classes) ? classes : [])
      .map((klass) => {
        const id = toId(klass)
        if (!id) return null
        const name = klass?.name || klass?.nome
        const gradePart = klass?.series ? `${klass.series}º${klass.letter ?? ''}`.trim() : ''
        const discipline = klass?.discipline || klass?.disciplina || klass?.subject || ''
        const fallback = [gradePart && `Turma ${gradePart}`, discipline].filter(Boolean).join(' • ')
        return {
          id,
          label: name || fallback || 'Turma',
        }
      })
      .filter(Boolean)
  }, [classes])

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        ['bold', 'italic', 'underline'],
        [{ background: [] }],
        [{ color: [] }],
        [{ size: [] }],
        [{ align: [] }],
        ['link'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['image'],
        ['clean'],
      ],
      handlers: {
        image: async () => {
          const input = document.createElement('input')
          input.setAttribute('type', 'file')
          input.setAttribute('accept', 'image/jpeg,image/png,image/jpg')
          input.click()
          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return
            try {
              const uploaded = await uploadAnnouncementImage(file)
              if (!uploaded?.url) {
                throw new Error('URL ausente')
              }
              const quill = quillRef.current?.getEditor()
              if (quill) {
                const range = quill.getSelection(true)
                const index = range?.index ?? quill.getLength()
                quill.insertEmbed(index, 'image', uploaded.url, 'user')
                quill.setSelection(index + 1, 0)
              }
            } catch (err) {
              console.error('[AnnouncementModal] Falha ao subir imagem', err)
              toast.error('Não foi possível enviar a imagem.')
            }
          }
        },
      },
    },
  }), [])

  const formats = useMemo(
    () => [
      'header',
      'bold',
      'italic',
      'underline',
      'strike',
      'blockquote',
      'color',
      'background',
      'list',
      'bullet',
      'align',
      'link',
      'image',
      'size',
    ],
    []
  )

  const parsedEmails = useMemo(() => {
    return sanitizeEmails(emailList.split(EMAIL_SPLIT_REGEX))
  }, [emailList])

  const plainText = useMemo(() => stripHtml(editorValue), [editorValue])

  const canSubmit = useMemo(() => {
    if (!subject.trim()) return false
    if (!plainText.trim()) return false
    if (targetMode === 'class') {
      return selectedClasses.length > 0
    }
    return parsedEmails.length > 0
  }, [subject, plainText, targetMode, selectedClasses.length, parsedEmails.length])

  const resetState = () => {
    setSubject('')
    setEditorValue('')
    setAttachments([])
    setSelectedClasses([])
    setEmailList('')
    setBccTeachers(false)
    setTargetMode('class')
    setSendMode('now')
    setScheduleAt('')
  }

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type === 'application/pdf')
    if (!files.length) return
    setAttachments((prev) => [...prev, ...files])
    event.target.value = ''
  }

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const payload = {
        type: targetMode,
        value: targetMode === 'class' ? selectedClasses : parsedEmails,
        subject: subject.trim(),
        html: editorValue,
        message: plainText,
        scheduleAt: sendMode === 'schedule' && scheduleAt ? scheduleAt : undefined,
        bccTeachers: targetMode === 'class' ? bccTeachers : false,
        attachments,
      }

      const response = await createAnnouncement(payload)
      toast.success('Aviso criado')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('announcements:refresh'))
      }
      if (response?.mail?.sent === false) {
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

  const closeIfAllowed = () => {
    if (submitting) return
    onClose()
    resetState()
  }

  return (
    <Modal open={open} onClose={closeIfAllowed}>
      <div className="w-full max-w-3xl p-6">
        <h2 className="text-xl font-semibold text-slate-900">Novo aviso</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assunto</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mensagem</label>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              modules={modules}
              formats={formats}
              value={editorValue}
              onChange={setEditorValue}
              className="rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="mb-1 block text-sm font-medium text-slate-700">Anexos (PDF)</label>
              <input type="file" accept="application/pdf" multiple onChange={handleAttachmentChange} />
            </div>
            {attachments.length ? (
              <ul className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <span className="truncate">{file.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)}>
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
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
                  onChange={(event) =>
                    setSelectedClasses(Array.from(event.target.selectedOptions).map((option) => option.value))
                  }
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
                  checked={bccTeachers}
                  onChange={(event) => setBccTeachers(event.target.checked)}
                />
                Incluir professores em CCO
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
              <p className="mt-1 text-xs text-slate-500">Destinatários válidos: {parsedEmails.length}</p>
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
            <Button type="button" variant="ghost" onClick={closeIfAllowed} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting} className="btn-primary">
              {submitting ? 'Enviando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
