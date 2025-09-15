import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthStateProvider } from './store/AuthStateProvider'
import { EnhancedAuthProvider } from './store/EnhancedAuthProvider'
import { SessionExpiredModal } from '@/components/auth/SessionExpiredModal'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EnhancedAuthProvider>
      <AuthStateProvider>
        <RouterProvider router={router} />
        <SessionExpiredModal />
      </AuthStateProvider>
    </EnhancedAuthProvider>
  </React.StrictMode>,
)
