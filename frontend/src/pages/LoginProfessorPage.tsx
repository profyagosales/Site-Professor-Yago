import React from 'react';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginProfessorPage(): JSX.Element {
  const handleSubmit = (data: { email: string; password: string; role: 'aluno' | 'professor' }) => {
    console.log('[login professor]', data);
    // TODO: autenticar e, no sucesso, setar user e navegar
  };
  return <LoginForm role="professor" onSubmit={handleSubmit} />;
}
