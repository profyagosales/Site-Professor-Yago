import { useMemo, useState } from 'react'
import { create } from '@/services/students'
import { toast } from 'react-toastify'

const initialForm = {
  photoFile: null,
  number: '',
  name: '',
  phone: '',
  email: '',
  password: '',
}

export default function NewStudentModal({ classId, isOpen, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)

  function handleClose() {
    setForm(initialForm)
    onClose?.()
  }

  const disabled = useMemo(() => {
    return (
      submitting ||
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password.trim() ||
      !form.number.trim()
    )
  }, [submitting, form])

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (disabled) return
    if (!/^[0-9]+$/.test(form.number)) {
      toast.error('Número inválido')
      return
    }
    if (form.password.length < 6) {
      toast.error('Senha muito curta')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('E-mail inválido')
      return
    }
    setSubmitting(true)
    try {
      const created = await create(classId, form)
      toast.success('Aluno criado')
      onCreated?.(created)
      handleClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao criar aluno')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Novo Aluno</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Foto</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => set('photoFile', e.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-gray-300 p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Número</label>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.number}
              onChange={(e) => set('number', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 p-2"
              placeholder="Ex.: 12"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 p-2"
              placeholder="Nome completo"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Telefone</label>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 p-2"
              placeholder="(61) 9 9999-9999"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 p-2"
              placeholder="aluno@exemplo.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 p-2"
              placeholder="Crie uma senha"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button type="button" onClick={handleClose} className="rounded-lg border border-gray-300 px-4 py-2">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

