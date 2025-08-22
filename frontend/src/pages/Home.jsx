import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-400 to-orange-600 flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white drop-shadow-md mb-10 animate-pulse">
          Professor Yago
        </h1>
        <div className="flex gap-4 justify-center">
          <Link
            to="/login-professor"
            className="bg-white text-orange-600 font-semibold rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition"
          >
            Sou Professor
          </Link>
          <Link
            to="/login-aluno"
            className="bg-white text-orange-600 font-semibold rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition"
          >
            Sou Aluno
          </Link>
        </div>
      </div>
    </div>
  );
}
