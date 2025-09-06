import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthStateProvider';
import api from '../services/api';

// Interface para os temas de redação
interface Theme {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

// Interface para as redações
interface Essay {
  id: string;
  title: string;
  theme: Theme;
  status: 'pending' | 'correcting' | 'completed';
  submissionDate: string;
  grade?: number;
}

export function DashboardPage() {
  const { auth } = useAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Buscar temas disponíveis
        const themesResponse = await api.get('/themes');
        setThemes(themesResponse.data);
        
        // Buscar redações do usuário
        const essaysResponse = await api.get('/essays/my');
        setEssays(essaysResponse.data);
      } catch (err) {
        setError('Erro ao carregar os dados. Por favor, tente novamente mais tarde.');
        console.error('Erro ao buscar dados:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard de Redações</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 mr-4">
            {auth.user?.photoUrl ? (
              <img 
                src={auth.user.photoUrl} 
                alt={auth.user?.name} 
                className="w-full h-full rounded-full object-cover" 
              />
            ) : (
              <span className="text-xl font-bold">{auth.user?.name?.charAt(0)}</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{auth.user?.name}</h2>
            <p className="text-gray-600 text-sm">{auth.user?.role === 'student' ? 'Aluno' : 'Professor'}</p>
          </div>
        </div>
      </div>
      
      {auth.user?.role === 'student' && (
        <>
          <h2 className="text-xl font-semibold mb-4">Temas Disponíveis</h2>
          
          {themes.length === 0 ? (
            <p className="text-gray-500">Nenhum tema disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {themes.map((theme) => (
                <div key={theme.id} className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
                  <h3 className="font-semibold text-lg mb-2">{theme.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{theme.description}</p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm">
                    Enviar Redação
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <h2 className="text-xl font-semibold mb-4">Minhas Redações</h2>
          
          {essays.length === 0 ? (
            <p className="text-gray-500">Você ainda não enviou nenhuma redação.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tema
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Envio
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nota
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {essays.map((essay) => (
                    <tr key={essay.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{essay.title}</div>
                        <div className="text-sm text-gray-500">{essay.theme.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(essay.submissionDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${essay.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            essay.status === 'correcting' ? 'bg-blue-100 text-blue-800' : 
                            'bg-green-100 text-green-800'}`}>
                          {essay.status === 'pending' ? 'Aguardando correção' : 
                           essay.status === 'correcting' ? 'Em correção' : 'Corrigida'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {essay.grade ?? '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          Ver
                        </button>
                        {essay.status === 'completed' && (
                          <button className="text-green-600 hover:text-green-900">
                            Baixar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      
      {auth.user?.role === 'teacher' && (
        <>
          <h2 className="text-xl font-semibold mb-4">Redações para Corrigir</h2>
          
          {essays.length === 0 ? (
            <p className="text-gray-500">Não há redações pendentes para correção.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aluno
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tema
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Envio
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {essays.map((essay) => (
                    <tr key={essay.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">Aluno</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{essay.title}</div>
                        <div className="text-sm text-gray-500">{essay.theme.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(essay.submissionDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${essay.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            essay.status === 'correcting' ? 'bg-blue-100 text-blue-800' : 
                            'bg-green-100 text-green-800'}`}>
                          {essay.status === 'pending' ? 'Aguardando correção' : 
                           essay.status === 'correcting' ? 'Em correção' : 'Corrigida'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          Ver
                        </button>
                        {essay.status !== 'completed' && (
                          <button className="text-green-600 hover:text-green-900">
                            Corrigir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Gerenciar Temas</h2>
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
              Criar Novo Tema
            </button>
          </div>
        </>
      )}
    </div>
  );
}
