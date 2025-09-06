import AuthShell from '@/components/auth/AuthShell';
import { CardBody } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '@/services/api';
import { initializeSession, getToken } from '@/auth/token';
import { ROUTES } from '@/routes';

export default function LoginAluno() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      const { data } = await api.post('/auth/login-student', {
        email,
        password,
      });
      if (data?.token) {
        // Inicializa sessão com auto-logout
        initializeSession(data.token);
        localStorage.setItem('role', 'student');
        setAuthToken(data.token);
        navigate(ROUTES.aluno.resumo, { replace: true });
      } else {
        setErro(data?.message || 'Erro no login');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setErro(error?.response?.data?.message || 'Erro no login do aluno');
    }
  }

  return (
    <AuthShell
      roleLabel='Aluno'
      heading='Entrar no portal'
      subheading='Use seu e-mail e sua senha.'
      bullets={[
        'Veja suas notas e recados',
        'Envie redações e acompanhe correções',
        'Acesse gabaritos e materiais',
      ]}
    >
      <form onSubmit={handleSubmit} className='space-y-4' data-testid="login-form">
        <Field
          label='E-mail'
          type='email'
          required
          value={email}
          placeholder='seunome@exemplo.com'
          autoComplete='email'
          onChange={e => setEmail(e.target.value)}
          data-testid="email-input"
        />
        <Field
          label='Senha'
          type='password'
          required
          value={password}
          placeholder='••••••••'
          autoComplete='current-password'
          onChange={e => setPassword(e.target.value)}
          data-testid="password-input"
        />
        {erro && <p className='text-sm text-red-600' data-testid="error-message">{erro}</p>}
        <div className='pt-2'>
          <Button type='submit' className='w-full' data-testid="submit-button">
            Entrar
          </Button>
        </div>
      </form>
      <div className='mt-6 text-xs text-ys-ink-3'>
        Precisa de ajuda? Procure seu(a) professor(a) ou coordenação.
      </div>
    </AuthShell>
  );
}
