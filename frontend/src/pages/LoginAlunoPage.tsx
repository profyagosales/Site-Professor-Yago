import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthStateProvider'

export function LoginAlunoPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { loginStudent } = useAuth()
  const navigate = useNavigate()
  
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos')
      return
    }
    
    try {
      setIsLoading(true)
      setError('')
      
      await loginStudent(email, password)
      console.log('Login bem-sucedido!')
      navigate('/dashboard')
    } catch (err: any) {
      console.error('Erro ao fazer login:', err)
      setError(err.response?.data?.message || 'Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Login de Aluno</h1>
        
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="aluno@exemplo.com" 
              required 
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <input 
              type="password" 
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••" 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
