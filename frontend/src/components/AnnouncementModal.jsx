import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { toast } from 'react-toastify'
import { listClasses } from '@/services/classes'
import { createAnnouncement, updateAnnouncement, uploadAnnouncementImage } from '@/services/announcements'
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

const sanitizeEmails = (rawList) =>
  rawList
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((email) => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email))

const DEFAULT_EDITOR_VALUE = '<p><br></p>'

const modules = (uploadHandler) => ({
  toolbar: {
    container: [
      ['bold', 'italic', 'underline'],
      [{ background: [] }],
      [{ color: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ align: [] }],
      ['link'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['image'],
      ['clean'],
    ],
    handlers: {
      image: uploadHandler,
    },
  },
})

const formats = [
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
  'font',
]

export default function AnnouncementModal({
  open,
  onClose,
  onSaved,
  initialAnnouncement = null,
  defaultClassIds = [],
}) {
  const isEditMode = Boolean(initialAnnouncement?.id)

  const quillRef = useRef(null)
  const [classes, setClasses] = useState([])
  const [subject, setSubject] = useState('')
  const [editorValue, setEditorValue] = useState(DEFAULT_EDITOR_VALUE)
  const [existingAttachments, setExistingAttachments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [selectedClasses, setSelectedClasses] = useState([])
  const [emailList, setEmailList] = useState('')
  const [bccTeachers, setBccTeachers] = useState(false)
  const [targetMode, setTargetMode] = useState('class')
  const [sendMode, setSendMode] = useState('now')
  const [scheduleAt, setScheduleAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const parsedEmails = useMemo(() => sanitizeEmails(emailList.split(EMAIL_SPLIT_REGEX)), [emailList])
  const plainText = useMemo(() => stripHtml(editorValue), [editorValue])

  const canSubmit = useMemo(() => {
    if (!subject.trim()) return false
    if (!plainText.trim()) return false
    if (targetMode === 'class') {
      return selectedClasses.length > 0
    }
    return parsedEmails.length > 0
  }, [subject, plainText, targetMode, selectedClasses.length, parsedEmails.length])

  const applyInitialData = useCallback(
    (announcement) => {
      if (announcement) {
        setSubject(announcement.subject || '')
        setEditorValue(announcement.html || DEFAULT_EDITOR_VALUE)
        setExistingAttachments(announcement.attachments || [])
        setAttachments([])
        const target = announcement.target || { type: 'class', value: [] }
        setTargetMode(target.type === 'email' ? 'email' : 'class')
        if (target.type === 'class') {
          setSelectedClasses(Array.isArray(target.value) ? target.value.map(String) : [])
          setEmailList('')
        } else {
          setSelectedClasses([])
          setEmailList(Array.isArray(target.value) ? target.value.join(', ') : '')
        }
        setBccTeachers(Boolean(announcement.includeTeachers))
        const scheduled = announcement.scheduleAt || announcement.scheduledFor || ''
        setScheduleAt(scheduled ? scheduled.slice(0, 16) : '')
        setSendMode(scheduled ? 'schedule' : 'now')
      } else {
        setSubject('')
        setEditorValue(DEFAULT_EDITOR_VALUE)
        setExistingAttachments([])
        setAttachments([])
        const preset = Array.isArray(defaultClassIds)
          ? defaultClassIds.map((value) => String(value)).filter(Boolean)
          : []
        setSelectedClasses(preset)
        setEmailList('')
        setBccTeachers(false)
        setTargetMode(preset.length ? 'class' : 'class')
        setSendMode('now')
        setScheduleAt('')
      }
    },
    [defaultClassIds]
  )

  useEffect(() => {
    if (!open) return
    listClasses()
      .then((response) => {
        const entries = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
        setClasses(entries)
      })
      .catch(() => setClasses([]))
  }, [open])

  useEffect(() => {
    if (!open) return
    applyInitialData(initialAnnouncement)
  }, [open, initialAnnouncement, applyInitialData])

  const closeIfAllowed = useCallback(
    (force = false) => {
      if (submitting && !force) return
      onClose()
      applyInitialData(null)
    },
    [applyInitialData, onClose, submitting]
  )

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type === 'application/pdf')
    if (!files.length) return
    setAttachments((prev) => [...prev, ...files])
    event.target.value = ''
  }

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index))
  }

  const removeExistingAttachment = (index) => {
    setExistingAttachments((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleImageUpload = useCallback(async () => {
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
        const quill = quillRef.current?.getEditor?.()
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
  }, [])

  const submitLabel = submitting
    ? isEditMode
      ? 'Atualizando…'
      : 'Enviando…'
    : isEditMode
      ? 'Atualizar'
      : 'Salvar'

  const handleEditorChange = useCallback((content, _delta, _source, editor) => {
    const html = typeof editor?.getHTML === 'function' ? editor.getHTML() : content
    setEditorValue(html)
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit || submitting) return

    const payload = {
      type: targetMode,
      value: targetMode === 'class' ? selectedClasses : parsedEmails,
      subject: subject.trim(),
      html: editorValue,
      message: plainText,
      scheduleAt: sendMode === 'schedule' && scheduleAt ? scheduleAt : undefined,
      bccTeachers: targetMode === 'class' ? bccTeachers : false,
      attachments,
      keepAttachments: existingAttachments.map((item) => item.url).filter(Boolean),
    }

    setSubmitting(true)
    try {
      const response = isEditMode && initialAnnouncement?.id
        ? await updateAnnouncement(initialAnnouncement.id, payload)
        : await createAnnouncement(payload)

      toast.success(isEditMode ? 'Aviso atualizado' : 'Aviso criado')
      if (response?.mail?.sent === false) {
        toast.warning('Aviso criado; e-mail pendente (ver logs)')
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('announcements:refresh'))
      }
      if (typeof onSaved === 'function') {
        await onSaved()
      }
      closeIfAllowed(true)
    } catch (err) {
      console.error('[AnnouncementModal] Falha ao salvar aviso', err)
      toast.error('Erro ao salvar aviso')
    } finally {
      setSubmitting(false)
    }
  }

  const quillModules = useMemo(() => modules(handleImageUpload), [handleImageUpload])

  return (
    <Modal open={open} onClose={closeIfAllowed} className="max-w-3xl">
      <div className="flex max-h-[80vh] flex-col">
        <header className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">{isEditMode ? 'Editar aviso' : 'Novo aviso'}</h2>
        </header>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="modal-body-scroll flex-1 pr-2">
            <div className="space-y-5">
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
                modules={quillModules}
                formats={formats}
                value={editorValue}
                onChange={handleEditorChange}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="mb-1 block text-sm font-medium text-slate-700">Anexos (PDF)</label>
                <input type="file" accept="application/pdf" multiple onChange={handleAttachmentChange} />
              </div>
              {existingAttachments.length ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Anexos atuais</p>
                  <ul className="space-y-2">
                    {existingAttachments.map((attachment, index) => (
                      <li
                        key={attachment.url ?? `${attachment.name}-${index}`}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        <a
                          href={attachment.url ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-slate-700 underline-offset-2 hover:underline"
                        >
                          📄 {attachment.name || 'Anexo'}
                        </a>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeExistingAttachment(index)}>
                          Remover
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {attachments.length ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Novos anexos</p>
                  <ul className="space-y-2">
                    {attachments.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        <span>📎 {file.name}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)}>
                          Remover
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
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
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={closeIfAllowed} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-primary" disabled={!canSubmit || submitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
