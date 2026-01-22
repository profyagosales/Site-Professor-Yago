import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { toast } from 'react-toastify'
import { listClasses } from '@/services/classes'
import { createAnnouncement, updateAnnouncement, uploadAnnouncementImage } from '@/services/announcements'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const QUILL_CONTAINER_STYLES = `
  .announcement-modal-quill-container .ql-container {
    height: auto;
    border: none;
    font-size: inherit;
  }
  .announcement-modal-quill-container .ql-editor {
    min-height: 300px;
  }
  .announcement-modal-quill-container .ql-toolbar {
    border-radius: 0.75rem 0.75rem 0 0;
  }
`

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
    return true
  }, [form.subject, form.plainText])

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

    // Determinar tipo e valor do alvo
    let targetType = form.targetMode === 'email' ? 'email' : 'class'
    let targetValue = form.targetMode === 'email' 
      ? form.emailList.split(EMAIL_SPLIT_REGEX).map((e) => e.trim()).filter(Boolean)
      : form.selectedClasses

    // Se for criação, enviar para todas as turmas do professor
    if (!isEditMode) {
      targetType = 'class'
      targetValue = availableClasses.map((klass) => klass.id)
    }

    const payload = {
      type: targetType,
      value: targetValue,
      subject: form.subject.trim(),
      html: form.html,
      message: form.plainText,
      scheduleAt: undefined,
      bccTeachers: false,
      keepAttachments: (initialAnnouncement?.attachments || [])
        .map((item) => item.url)
        .filter(Boolean),
    }

    setSubmitting(true)
    try {
      const response = isEditMode && editingIdString
        ? await updateAnnouncement(editingIdString, payload)
        : await createAnnouncement(payload)

      // Mensagem de sucesso
      toast.success(isEditMode ? 'Aviso atualizado!' : 'Aviso criado!')
      if (response?.mail?.sent === false) {
        toast.warning('Aviso criado; e-mail pendente (ver logs)')
      }

      // Disparar evento de refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('announcements:refresh'))
      }

      // Limpar draft
      draftsRef.current.delete(contextKey)

      // Resetar formulário se for criação
      if (!isEditMode) {
        setForm(mapFromDefaults(defaultClassIds))
      }

      // Chamar callback de salvamento
      const onSavedHandler = typeof onSaved === 'function' ? onSaved : () => {}
      onSavedHandler()

      // Fechar modal imediatamente (forçando mesmo durante submitting)
      closeIfAllowed(true)
      setSubmitting(false)
    } catch (err) {
      console.error('[AnnouncementModal] Falha ao salvar aviso', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar aviso')
      setSubmitting(false)
    }
  }

  const quillModules = useMemo(() => modules(handleImageUpload), [handleImageUpload])

  return (
    <>
      <style>{QUILL_CONTAINER_STYLES}</style>
      <Modal open={open} onClose={closeIfAllowed} className="max-w-5xl overflow-hidden">
      <div className="flex h-screen max-h-[90vh] flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">{isEditMode ? 'Editar aviso' : 'Novo aviso'}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => closeIfAllowed(true)} disabled={submitting}>
            Fechar
          </Button>
        </header>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
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
              <div className="announcement-modal-quill-container h-80 overflow-y-auto rounded-xl border border-slate-200 shadow-sm">
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  modules={quillModules}
                  formats={formats}
                  value={form.html}
                  onChange={onQuillChange}
                />
              </div>
            </div>

          </div>
          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
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
    </>
  )
}
