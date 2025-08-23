import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { loginTeacher } from '@api';
import LogoYS from '@/components/LogoYS';
import '@/components/login.css';

function LoginProfessor() {
  const { register, handleSubmit } = useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const { token, role } = await loginTeacher(data);
      if (token) localStorage.setItem('token', token);
      localStorage.setItem('role', role || 'teacher');
      toast.success('Login realizado');
      navigate(role === 'teacher' ? '/dashboard-professor' : '/', { replace: true });
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
    if (token && role === 'teacher') {
      navigate('/dashboard-professor', { replace: true });
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
        <h2 className="text-xl text-center">Login Professor</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          {...register('email', { required: true })}
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

export default LoginProfessor;
