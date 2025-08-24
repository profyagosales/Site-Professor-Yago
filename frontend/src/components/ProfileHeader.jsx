import React from 'react'

export default function ProfileHeader({ name, subtitle, avatarUrl, onLogout }) {
  const initials = name?.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-br from-[#ffb347] to-[#ff8c2b] text-white shadow-[0_8px_24px_rgba(255,140,43,0.2)]">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-white/20 grid place-items-center overflow-hidden border-2 border-white/40">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-lg">{initials}</span>
          )}
        </div>
        <div>
          <div className="font-bold text-lg">{name}</div>
          {subtitle && <div className="text-sm text-ys-ink-2 mt-0.5">{subtitle}</div>}
        </div>
      </div>

      <button
        type="button"
        className="bg-white text-orange-500 px-4 py-2 rounded-lg font-bold shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        onClick={onLogout}
      >
        Sair
      </button>
    </div>
  )
}
