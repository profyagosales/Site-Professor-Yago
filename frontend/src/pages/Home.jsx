import { useNavigate } from 'react-router-dom';
import LogoYS from '@/components/LogoYS';
import { ROUTES } from '@/routes';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-orange-500 to-orange-300">
      <div className="grid gap-4 justify-items-center">
        <LogoYS />
        <div className="flex gap-4 justify-center mt-8">
          <button
            type="button"
            onClick={() => navigate(ROUTES.auth.loginProf)}
            className="bg-white text-orange-600 font-semibold rounded-xl px-6 py-3 shadow transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            Sou Professor
          </button>
          <button
            type="button"
            onClick={() => navigate(ROUTES.loginAluno)}
            className="bg-white text-orange-600 font-semibold rounded-xl px-6 py-3 shadow transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            Sou Aluno
          </button>
        </div>
      </div>
    </div>
  );
}
