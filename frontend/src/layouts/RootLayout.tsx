import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { paths } from '../routes/paths';
import { useAuth } from '../store/AuthStateProvider';

export function RootLayout() {
  const { auth, logout } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">Professor Yago Sales</Link>
          
          <nav>
            {auth.isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm hidden md:inline-block">
                  Olá, {auth.user?.name}
                </span>
                <button 
                  onClick={logout}
                  className="bg-blue-700 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
                >
                  Sair
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  to={paths.loginAluno}
                  className="text-sm hover:text-blue-200 transition-colors"
                >
                  Login Aluno
                </Link>
                <Link 
                  to={paths.loginProfessor}
                  className="bg-blue-700 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
                >
                  Login Professor
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      
      <main className="flex-grow">
        <Outlet />
      </main>
      
      <footer className="bg-gray-100 py-8 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Professor Yago Sales. Todos os direitos reservados.</p>
          <div className="mt-2 text-sm">
            <span>Desenvolvido com ❤️ para educação de qualidade</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
