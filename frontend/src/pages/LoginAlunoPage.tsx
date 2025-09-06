import React from 'react';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginAlunoPage(): JSX.Element {
  const handleSubmit = (data: { email: string; password: string; role: 'aluno' | 'professor' }) => {
    console.log('[login aluno]', data);
    // TODO: autenticar e, no sucesso, setar user e navegar
  };
  return <LoginForm role="aluno" onSubmit={handleSubmit} />;
}
