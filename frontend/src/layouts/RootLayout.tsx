import { Outlet } from 'react-router-dom'

export function RootLayout() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Professor Yago Sales</h1>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Professor Yago Sales. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
