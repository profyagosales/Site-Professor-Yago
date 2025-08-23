import { useNavigate } from 'react-router-dom';
import LogoYS from '@/components/LogoYS';
import '@/components/login.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="login-screen no-nav">
      <div className="center-stack">
        <LogoYS />
        <div className="flex gap-4 justify-center mt-8">
          <button
            type="button"
            onClick={() => navigate('/login-professor')}
            className="bg-white text-orange-600 font-semibold rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition"
          >
            Sou Professor
          </button>
          <button
            type="button"
            onClick={() => navigate('/login-aluno')}
            className="bg-white text-orange-600 font-semibold rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition"
          >
            Sou Aluno
          </button>
        </div>
      </div>
    </div>
  );
}
