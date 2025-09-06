import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthStateProvider } from './store/AuthStateProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthStateProvider>
      <RouterProvider router={router} />
    </AuthStateProvider>
  </React.StrictMode>,
)
