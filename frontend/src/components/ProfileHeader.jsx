import React from 'react'
import Avatar from '@/components/ui/Avatar'

export default function ProfileHeader({ profile, name: propName, subtitle, avatarUrl, onLogout }) {
  const name = propName || profile?.name || ''
  const avatar = avatarUrl || profile?.photoUrl || profile?.avatarUrl

  return (
    <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-br from-[#ffb347] to-[#ff8c2b] text-white shadow-[0_8px_24px_rgba(255,140,43,0.2)]">
      <div className="flex items-center gap-3">
        <Avatar src={avatar} name={name} className="w-14 h-14 border-2 border-white/40" />
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

