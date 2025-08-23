import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { loginStudent } from '@api';
import LogoYS from '@/components/LogoYS';
import '@/components/login.css';

function LoginAluno() {
  const { register, handleSubmit } = useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const { token, role } = await loginStudent(data);
      if (token) localStorage.setItem('token', token);
      localStorage.setItem('role', role || 'student');
      toast.success('Login realizado');
      navigate(role === 'student' ? '/dashboard-aluno' : '/', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao autenticar';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role === 'student') {
      navigate('/dashboard-aluno', { replace: true });
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="page-centered">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <main className="login-screen no-nav">
      <LogoYS size={120} showWords={false} />
      <form onSubmit={handleSubmit(onSubmit)} className="login-card">
        <h2 className="text-xl text-center">Login Aluno</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input
          type="number"
          placeholder="Número"
          {...register('rollNumber', { required: true })}
          className="form-field"
        />
        <input
          type="tel"
          placeholder="Telefone"
          {...register('phone', { required: true })}
          className="form-field"
        />
        <input
          type="password"
          placeholder="Senha"
          {...register('password', { required: true })}
          className="form-field"
        />
        <button type="submit" className="btn-submit">
          Entrar
        </button>
      </form>
    </main>
  );
}

export default LoginAluno;

