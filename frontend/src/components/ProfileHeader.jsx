import React from 'react'
import './profile-header.css'

export default function ProfileHeader({ name, subtitle, avatarUrl, onLogout }) {
  const initials = name?.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="ph-wrapper">
      <div className="ph-left">
        <div className="ph-avatar">
          {avatarUrl ? <img src={avatarUrl} alt={name} /> : <span>{initials}</span>}
        </div>
        <div>
          <div className="ph-name">{name}</div>
          {subtitle && <div className="ph-sub">{subtitle}</div>}
        </div>
      </div>

      <button className="ph-logout" onClick={onLogout}>Sair</button>
    </div>
  )
}
