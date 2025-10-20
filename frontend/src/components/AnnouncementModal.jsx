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

const INITIAL_FORM = {
  subject: '',
  html: DEFAULT_EDITOR_VALUE,
  plainText: '',
  attachments: [],
  existingAttachments: [],
  selectedClasses: [],
  emailList: '',
  bccTeachers: false,
  targetMode: 'class',
  sendMode: 'now',
  scheduleAt: '',
}

const mapFromDefaults = (defaultClassIds = []) => {
  const preset = Array.isArray(defaultClassIds)
    ? defaultClassIds.map((value) => String(value)).filter(Boolean)
    : []

  return {
    ...INITIAL_FORM,
    selectedClasses: preset,
    targetMode: 'class',
  }
}

const mapFromEditing = (announcement, defaultClassIds = []) => {
  if (!announcement) {
    return mapFromDefaults(defaultClassIds)
  }

  const target = announcement.target || { type: 'class', value: [] }
  const isClassTarget = target.type !== 'email'
  const selectedClasses = isClassTarget
    ? (Array.isArray(target.value) ? target.value : [])
        .map((value) => String(value))
        .filter(Boolean)
    : []
  const emails = !isClassTarget && Array.isArray(target.value) ? target.value.join(', ') : ''
  const html = announcement.html || DEFAULT_EDITOR_VALUE
  const scheduleSource = announcement.scheduleAt || announcement.scheduledFor || ''

  return {
    subject: announcement.subject || '',
    html,
    plainText: stripHtml(html),
    attachments: [],
    existingAttachments: announcement.attachments || [],
    selectedClasses,
    emailList: emails,
    bccTeachers: Boolean(announcement.includeTeachers),
    targetMode: isClassTarget ? 'class' : 'email',
    sendMode: scheduleSource ? 'schedule' : 'now',
    scheduleAt: scheduleSource ? scheduleSource.slice(0, 16) : '',
  }
}

export default function AnnouncementModal({
  open,
  onClose,
  onSaved,
  initialAnnouncement = null,
  defaultClassIds = [],
}) {
  const editingId = initialAnnouncement?.id ?? initialAnnouncement?._id ?? null
  const isEditMode = Boolean(editingId)

  const quillRef = useRef(null)
  const draftsRef = useRef(new Map())
  const [classes, setClasses] = useState([])
  const normalizedDefaultIds = useMemo(
    () =>
      Array.isArray(defaultClassIds)
        ? defaultClassIds
            .map((value) => String(value))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
        : [],
    [defaultClassIds],
  )
  const editingIdString = editingId ? String(editingId) : null
  const contextKey = editingIdString ? `edit:${editingIdString}` : `create:${normalizedDefaultIds.join('|')}`
  const [activeContext, setActiveContext] = useState(contextKey)
  const [form, setForm] = useState(() =>
    initialAnnouncement ? mapFromEditing(initialAnnouncement, defaultClassIds) : mapFromDefaults(defaultClassIds),
  )
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

  const canSubmit = useMemo(() => {
    if (!form.subject.trim()) return false
    if (!form.plainText.trim()) return false
    if (form.targetMode === 'class') {
      return form.selectedClasses.length > 0
    }
    return form.emailList.split(EMAIL_SPLIT_REGEX).some((entry) => entry.trim())
  }, [form.subject, form.plainText, form.targetMode, form.selectedClasses.length, form.emailList])

  useEffect(() => {
    if (!open) return
    listClasses()
      .then((response) => {
        const entries = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        setClasses(entries)
      })
      .catch(() => setClasses([]))
  }, [open])

  useEffect(() => {
    if (contextKey === activeContext) return

    const storedDraft = draftsRef.current.get(contextKey)
    const nextForm = storedDraft
      ? storedDraft
      : initialAnnouncement
        ? mapFromEditing(initialAnnouncement, defaultClassIds)
        : mapFromDefaults(defaultClassIds)

    draftsRef.current.set(contextKey, nextForm)
    setForm(nextForm)
    setActiveContext(contextKey)
  }, [contextKey, activeContext, initialAnnouncement, defaultClassIds])

  useEffect(() => {
    draftsRef.current.set(activeContext, form)
  }, [activeContext, form])

  const closeIfAllowed = useCallback(
    (force = false) => {
      if (submitting && !force) return
      onClose?.()
    },
    [onClose, submitting]
  )

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type === 'application/pdf')
    if (!files.length) return
    setForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }))
    event.target.value = ''
  }

  const removeAttachment = (index) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, idx) => idx !== index),
    }))
  }

  const removeExistingAttachment = (index) => {
    setForm((prev) => ({
      ...prev,
      existingAttachments: prev.existingAttachments.filter((_, idx) => idx !== index),
    }))
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

  const onQuillChange = useCallback((content, _delta, _source, editor) => {
    const html = typeof editor?.getHTML === 'function' ? editor.getHTML() : content
    setForm((prev) => ({
      ...prev,
      html,
      plainText: stripHtml(html),
    }))
  }, [])

  const handleEmailsBlur = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      emailList: sanitizeEmails(prev.emailList.split(EMAIL_SPLIT_REGEX)).join(', '),
    }))
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit || submitting) return

    const sanitizedEmails = form.targetMode === 'email'
      ? sanitizeEmails(form.emailList.split(EMAIL_SPLIT_REGEX))
      : []

    const payload = {
      type: form.targetMode,
      value: form.targetMode === 'class' ? form.selectedClasses : sanitizedEmails,
      subject: form.subject.trim(),
      html: form.html,
      message: form.plainText,
      scheduleAt: form.sendMode === 'schedule' && form.scheduleAt ? form.scheduleAt : undefined,
      bccTeachers: form.targetMode === 'class' ? form.bccTeachers : false,
      attachments: form.attachments,
      keepAttachments: form.existingAttachments.map((item) => item.url).filter(Boolean),
    }

    setSubmitting(true)
    try {
      const response = isEditMode && editingIdString
        ? await updateAnnouncement(editingIdString, payload)
        : await createAnnouncement(payload)

      toast.success(isEditMode ? 'Aviso atualizado' : 'Aviso criado')
      if (response?.mail?.sent === false) {
        toast.warning('Aviso criado; e-mail pendente (ver logs)')
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('announcements:refresh'))
      }
      const onSavedHandler = typeof onSaved === 'function' ? onSaved : () => {}
      await onSavedHandler()
      draftsRef.current.delete(contextKey)
      if (!isEditMode) {
        setForm(mapFromDefaults(defaultClassIds))
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

  const bodyStyle = useMemo(
    () => ({ maxHeight: '70vh', overflowY: 'auto', overscrollBehavior: 'contain' }),
    []
  )

  return (
    <Modal open={open} onClose={closeIfAllowed} className="max-w-3xl overflow-hidden">
      <div className="flex max-h-[85vh] flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">{isEditMode ? 'Editar aviso' : 'Novo aviso'}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => closeIfAllowed(true)} disabled={submitting}>
            Fechar
          </Button>
        </header>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="space-y-5 px-6 py-4" style={bodyStyle}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Assunto</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={form.subject}
                onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
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
                value={form.html}
                onChange={onQuillChange}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="mb-1 block text-sm font-medium text-slate-700">Anexos (PDF)</label>
                <input type="file" accept="application/pdf" multiple onChange={handleAttachmentChange} />
              </div>
              {form.existingAttachments.length ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Anexos atuais</p>
                  <ul className="space-y-2">
                    {form.existingAttachments.map((attachment, index) => (
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
              {form.attachments.length ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Novos anexos</p>
                  <ul className="space-y-2">
                    {form.attachments.map((file, index) => (
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
                  checked={form.targetMode === 'class'}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      targetMode: 'class',
                      emailList: '',
                    }))
                  }
                />
                Enviar para turmas
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="target"
                  value="email"
                  checked={form.targetMode === 'email'}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      targetMode: 'email',
                      selectedClasses: [],
                      bccTeachers: false,
                    }))
                  }
                />
                Enviar para e-mails
              </label>
            </div>

            {form.targetMode === 'class' ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Turmas</label>
                  <select
                    multiple
                    className="h-36 max-h-40 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 overflow-auto"
                    value={form.selectedClasses}
                    onChange={(event) => {
                      const values = Array.from(event.target.selectedOptions || []).map((option) => option.value)
                      setForm((prev) => ({
                        ...prev,
                        selectedClasses: values,
                      }))
                    }}
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
                    checked={form.bccTeachers}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        bccTeachers: event.target.checked,
                      }))
                    }
                  />
                  Incluir professores em cópia oculta
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">E-mails (separados por vírgula)</label>
                  <textarea
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    value={form.emailList}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        emailList: event.target.value,
                      }))
                    }
                    onBlur={handleEmailsBlur}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="send-mode"
                  value="now"
                  checked={form.sendMode === 'now'}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      sendMode: 'now',
                      scheduleAt: '',
                    }))
                  }
                />
                Enviar agora
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="send-mode"
                    value="schedule"
                    checked={form.sendMode === 'schedule'}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        sendMode: 'schedule',
                      }))
                    }
                  />
                  Agendar envio
                </label>
                {form.sendMode === 'schedule' ? (
                  <input
                    type="datetime-local"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    value={form.scheduleAt}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        scheduleAt: event.target.value,
                      }))
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>
          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <Button type="button" variant="ghost" onClick={closeIfAllowed} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitLabel}
            </Button>
          </footer>
        </form>
      </div>
    </Modal>
  )
}
