import { useEffect } from 'react'
import { useEnhancedAuth } from '@/store/EnhancedAuthProvider'
import { useAuth } from '@/store/AuthStateProvider'
import { createPortal } from 'react-dom'

interface Props { onForce?: () => void }

export function SessionExpiredModal({ onForce }: Props) {
  const { state, refresh } = useEnhancedAuth()
  const { logout } = useAuth()

  useEffect(() => {
    // Fallback: se não reautenticar em 25s, força logout
    if (!state.meta.sessionExpired) return
    const t = setTimeout(() => { logout(); onForce?.() }, 25000)
    return () => clearTimeout(t)
  }, [state.meta.sessionExpired, logout, onForce])

  if (!state.meta.sessionExpired) return null

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in">
        <h2 className="text-lg font-semibold mb-2">Sessão expirada</h2>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Sua sessão de autenticação expirou ou foi invalidada. Você pode tentar reconectar agora.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => refresh().catch(()=>{})}
            className="w-full inline-flex justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-60"
            disabled={state.refreshing}
          >
            {state.refreshing ? 'Tentando reconectar...' : 'Tentar reconectar'}
          </button>
          <button
            onClick={() => logout()}
            className="w-full inline-flex justify-center px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-sm"
          >
            Fazer login novamente
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-4">Se você não fizer nada será desconectado automaticamente.</p>
      </div>
    </div>,
    document.body
  )
}
