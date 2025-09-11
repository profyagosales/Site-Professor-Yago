import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'
import api from '../services/api'

// Definir tipos para os temas
interface Theme {
  _id: string
  title: string
  active: boolean
  createdAt: string
  createdBy: {
    _id: string
    name: string
  }
}

interface ThemesResponse {
  themes: Theme[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export function GerenciarTemasPage() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Estado para o formulário de novo tema
  const [newThemeTitle, setNewThemeTitle] = useState('')
  const [newThemeActive, setNewThemeActive] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estado para edição de tema
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editActive, setEditActive] = useState(true)

  // Carregar temas
  useEffect(() => {
    fetchThemes()
  }, [page, searchQuery])

  const fetchThemes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get<ThemesResponse>(
        `/themes?page=${page}&limit=10&query=${encodeURIComponent(searchQuery)}`
      )
      
      setThemes(response.data.themes)
      setTotalPages(response.data.pagination.pages)
    } catch (err: any) {
      console.error('Erro ao carregar temas:', err)
      setError(err.message || 'Erro ao carregar temas')
    } finally {
      setLoading(false)
    }
  }

  // Criar um novo tema
  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newThemeTitle.trim()) {
      return
    }
    
    try {
      setIsSubmitting(true)
      
      await api.post('/themes', {
        title: newThemeTitle.trim(),
        active: newThemeActive
      })
      
      setNewThemeTitle('')
      setNewThemeActive(true)
      setIsFormOpen(false)
      fetchThemes()
    } catch (err: any) {
      console.error('Erro ao criar tema:', err)
      setError(err.message || 'Erro ao criar tema')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Atualizar tema
  const handleUpdateTheme = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingTheme || !editTitle.trim()) {
      return
    }
    
    try {
      setIsSubmitting(true)
      
      await api.put(`/themes/${editingTheme._id}`, {
        title: editTitle.trim(),
        active: editActive
      })
      
      setEditingTheme(null)
      fetchThemes()
    } catch (err: any) {
      console.error('Erro ao atualizar tema:', err)
      setError(err.message || 'Erro ao atualizar tema')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Excluir tema
  const handleDeleteTheme = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este tema?')) {
      return
    }
    
    try {
      setLoading(true)
      
      await api.delete(`/themes/${id}`)
      
      fetchThemes()
    } catch (err: any) {
      console.error('Erro ao excluir tema:', err)
      setError(err.message || 'Erro ao excluir tema')
      setLoading(false)
    }
  }

  // Iniciar edição de tema
  const startEditing = (theme: Theme) => {
    setEditingTheme(theme)
    setEditTitle(theme.title)
    setEditActive(theme.active)
  }

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">Gerenciar Temas</h1>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Link
              to={paths.dashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Voltar ao Dashboard
            </Link>
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              {isFormOpen ? 'Cancelar' : 'Novo Tema'}
            </button>
          </div>
        </div>

        {/* Formulário de busca */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <input
              type="text"
              placeholder="Buscar temas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow px-4 py-2 border rounded-md"
            />
            <button 
              onClick={() => {
                setPage(1)
                fetchThemes()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Formulário de novo tema */}
        {isFormOpen && (
          <div className="mb-6 bg-blue-50 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-4">Novo Tema</h2>
            <form onSubmit={handleCreateTheme}>
              <div className="mb-4">
                <label htmlFor="title" className="block mb-1 font-medium">
                  Título do tema
                </label>
                <input
                  type="text"
                  id="title"
                  value={newThemeTitle}
                  onChange={(e) => setNewThemeTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={newThemeActive}
                  onChange={(e) => setNewThemeActive(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="active">Tema ativo</label>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md mr-2 hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Tema'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulário de edição */}
        {editingTheme && (
          <div className="mb-6 bg-yellow-50 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-4">Editar Tema</h2>
            <form onSubmit={handleUpdateTheme}>
              <div className="mb-4">
                <label htmlFor="editTitle" className="block mb-1 font-medium">
                  Título do tema
                </label>
                <input
                  type="text"
                  id="editTitle"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="editActive">Tema ativo</label>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditingTheme(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md mr-2 hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Atualizar Tema'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 bg-red-100 text-red-700 p-4 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Lista de temas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Temas</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : themes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'Nenhum tema encontrado para a busca.' : 'Nenhum tema cadastrado.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Título</th>
                  <th className="border p-2 text-center">Status</th>
                  <th className="border p-2 text-center">Criado em</th>
                  <th className="border p-2 text-center">Criado por</th>
                  <th className="border p-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {themes.map((theme) => (
                  <tr key={theme._id} className="hover:bg-gray-50">
                    <td className="border p-2">{theme.title}</td>
                    <td className="border p-2 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          theme.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {theme.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="border p-2 text-center">
                      {formatDate(theme.createdAt)}
                    </td>
                    <td className="border p-2 text-center">
                      {theme.createdBy?.name || 'Desconhecido'}
                    </td>
                    <td className="border p-2 text-center">
                      <div className="flex justify-center space-x-1">
                        <button
                          onClick={() => startEditing(theme)}
                          className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTheme(theme._id)}
                          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex space-x-1">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className={`px-3 py-1 rounded ${
                  page === 1
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                &lt;
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Calcular os números de página a exibir
                let pageNum = page;
                if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                // Garantir que estamos dentro dos limites
                if (pageNum >= 1 && pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 rounded ${
                        page === pageNum
                          ? 'bg-blue-700 text-white'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
              
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className={`px-3 py-1 rounded ${
                  page === totalPages
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>
      <footer className="mt-8 text-center text-gray-500 text-sm">
        © 2025 Professor Yago Sales. Todos os direitos reservados.
      </footer>
    </div>
  )
}