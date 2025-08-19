import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function LoginAluno() {
  const { register, handleSubmit } = useForm();
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/auth/login-student', data);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard-aluno');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao autenticar');
    }
  };

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
