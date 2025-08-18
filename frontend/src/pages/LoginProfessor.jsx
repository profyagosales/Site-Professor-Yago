import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function LoginProfessor() {
  const { register, handleSubmit } = useForm();
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/auth/login-teacher', data);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard-professor');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao autenticar');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-lightGray pt-16">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white/80 shadow-lg p-8 rounded-lg w-full max-w-sm">
        <h2 className="text-xl mb-4 text-center">Login Professor</h2>
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
        <button type="submit" className="w-full bg-orange hover:bg-orange/80 text-white py-2 rounded">
          Entrar
        </button>
      </form>
    </div>
  );
}

export default LoginProfessor;
