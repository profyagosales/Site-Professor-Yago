import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'
import api from '../services/api'

// Definir tipos para os alunos
interface Student {
  _id: string
  name: string
  email: string
  role: 'student'
  active: boolean
  photoUrl?: string
  createdAt: string
}

interface StudentsResponse {
  users: Student[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export function GerenciarAlunosPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Estado para o formulário de novo aluno
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    password: '',
    active: true
  })
  
  // Estado para edição de aluno
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    active: true
  })

  // Carregar alunos
  useEffect(() => {
    fetchStudents()
  }, [page, searchQuery])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get<StudentsResponse>(
        `/students?page=${page}&limit=10&query=${encodeURIComponent(searchQuery)}`
      )
      
      setStudents(response.data.users)
      setTotalPages(response.data.pagination.pages)
    } catch (err: any) {
      console.error('Erro ao carregar alunos:', err)
      setError(err.message || 'Erro ao carregar alunos')
    } finally {
      setLoading(false)
    }
  }

  // Criar um novo aluno
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newStudent.name.trim() || !newStudent.email.trim() || !newStudent.password) {
      setError('Nome, email e senha são obrigatórios')
      return
    }
    
    try {
      setIsSubmitting(true)
      setError(null)
      
      await api.post('/students', {
        name: newStudent.name.trim(),
        email: newStudent.email.trim(),
        password: newStudent.password,
        active: newStudent.active
      })
      
      setNewStudent({
        name: '',
        email: '',
        password: '',
        active: true
      })
      setIsFormOpen(false)
      fetchStudents()
    } catch (err: any) {
      console.error('Erro ao criar aluno:', err)
      setError(err.response?.data?.message || err.message || 'Erro ao criar aluno')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Atualizar aluno
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingStudent || !editForm.name.trim() || !editForm.email.trim()) {
      setError('Nome e email são obrigatórios')
      return
    }
    
    try {
      setIsSubmitting(true)
      setError(null)
      
      const updateData: Record<string, any> = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        active: editForm.active
      }
      
      // Só enviar senha se foi preenchida
      if (editForm.password) {
        updateData.password = editForm.password
      }
      
      await api.put(`/students/${editingStudent._id}`, updateData)
      
      setEditingStudent(null)
      fetchStudents()
    } catch (err: any) {
      console.error('Erro ao atualizar aluno:', err)
      setError(err.response?.data?.message || err.message || 'Erro ao atualizar aluno')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Excluir aluno
  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.')) {
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      await api.delete(`/students/${id}`)
      
      fetchStudents()
    } catch (err: any) {
      console.error('Erro ao excluir aluno:', err)
      setError(err.response?.data?.message || err.message || 'Erro ao excluir aluno')
      setLoading(false)
    }
  }

  // Iniciar edição de aluno
  const startEditing = (student: Student) => {
    setEditingStudent(student)
    setEditForm({
      name: student.name,
      email: student.email,
      password: '', // Campo de senha vazio na edição
      active: student.active
    })
  }

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  // Manipular alterações no formulário de novo aluno
  const handleNewStudentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setNewStudent({
      ...newStudent,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  // Manipular alterações no formulário de edição
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setEditForm({
      ...editForm,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">Gerenciar Alunos</h1>
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
              {isFormOpen ? 'Cancelar' : 'Novo Aluno'}
            </button>
          </div>
        </div>

        {/* Formulário de busca */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow px-4 py-2 border rounded-md"
            />
            <button 
              onClick={() => {
                setPage(1)
                fetchStudents()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Formulário de novo aluno */}
        {isFormOpen && (
          <div className="mb-6 bg-green-50 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-4">Novo Aluno</h2>
            <form onSubmit={handleCreateStudent}>
              <div className="mb-4">
                <label htmlFor="name" className="block mb-1 font-medium">
                  Nome completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newStudent.name}
                  onChange={handleNewStudentChange}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="email" className="block mb-1 font-medium">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newStudent.email}
                  onChange={handleNewStudentChange}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="block mb-1 font-medium">
                  Senha
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={newStudent.password}
                  onChange={handleNewStudentChange}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={newStudent.active}
                  onChange={handleNewStudentChange}
                  className="mr-2"
                />
                <label htmlFor="active">Aluno ativo</label>
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
                  {isSubmitting ? 'Salvando...' : 'Criar Aluno'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulário de edição */}
        {editingStudent && (
          <div className="mb-6 bg-yellow-50 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-4">Editar Aluno</h2>
            <form onSubmit={handleUpdateStudent}>
              <div className="mb-4">
                <label htmlFor="editName" className="block mb-1 font-medium">
                  Nome completo
                </label>
                <input
                  type="text"
                  id="editName"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditFormChange}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="editEmail" className="block mb-1 font-medium">
                  Email
                </label>
                <input
                  type="email"
                  id="editEmail"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditFormChange}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="editPassword" className="block mb-1 font-medium">
                  Nova senha (deixe em branco para manter a atual)
                </label>
                <input
                  type="password"
                  id="editPassword"
                  name="password"
                  value={editForm.password}
                  onChange={handleEditFormChange}
                  className="w-full px-4 py-2 border rounded-md"
                />
              </div>
              
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="editActive"
                  name="active"
                  checked={editForm.active}
                  onChange={handleEditFormChange}
                  className="mr-2"
                />
                <label htmlFor="editActive">Aluno ativo</label>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md mr-2 hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Atualizar Aluno'}
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

      {/* Lista de alunos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Alunos</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'Nenhum aluno encontrado para a busca.' : 'Nenhum aluno cadastrado.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Nome</th>
                  <th className="border p-2 text-left">Email</th>
                  <th className="border p-2 text-center">Status</th>
                  <th className="border p-2 text-center">Criado em</th>
                  <th className="border p-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="border p-2">
                      <div className="flex items-center">
                        {student.photoUrl && (
                          <img 
                            src={student.photoUrl}
                            alt={`Foto de ${student.name}`}
                            className="w-8 h-8 rounded-full mr-2 object-cover"
                          />
                        )}
                        {student.name}
                      </div>
                    </td>
                    <td className="border p-2">{student.email}</td>
                    <td className="border p-2 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          student.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {student.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="border p-2 text-center">
                      {formatDate(student.createdAt)}
                    </td>
                    <td className="border p-2 text-center">
                      <div className="flex justify-center space-x-1">
                        <button
                          onClick={() => startEditing(student)}
                          className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student._id)}
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
    </div>
  )
}