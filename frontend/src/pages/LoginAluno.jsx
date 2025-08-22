import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '@api';
import { toast } from 'react-toastify';

function LoginAluno() {
  const { register, handleSubmit } = useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login-student', data);
      const { token } = res?.data?.data || res?.data || {};
      if (token) localStorage.setItem('token', token);
      localStorage.setItem('role', 'student');
      setSuccess('Login realizado');
      toast.success('Login realizado');
      navigate('/dashboard-aluno', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao autenticar';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('token')) {
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
    <div className="page-centered">
      <form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-sm">
        <h2 className="text-xl text-center">Login Aluno</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          {...register('email', { required: true })}
          className="mb-4 w-full p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Senha"
          {...register('password', { required: true })}
          className="mb-4 w-full p-2 border rounded"
        />
        <button type="submit" className="btn-primary w-full">
          Entrar
        </button>
      </form>
    </div>
  );
}

export default LoginAluno;
