import React from 'react';

type Props = {
  role: 'aluno' | 'professor';
  onSubmit?: (data: { email: string; password: string; role: 'aluno' | 'professor' }) => void;
};

export default function LoginForm({ role, onSubmit }: Props): JSX.Element {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPwd, setShowPwd] = React.useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.({ email, password, role });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 420,
        margin: '40px auto',
        padding: 24,
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        background: '#fff',
      }}
    >
      <h1 style={{ margin: 0, marginBottom: 8, fontSize: 22, fontWeight: 700 }}>
        Login do {role === 'aluno' ? 'Aluno' : 'Professor'}
      </h1>
      <p style={{ marginTop: 0, color: '#6b7280', fontSize: 14 }}>
        Informe seu e-mail e senha para continuar.
      </p>

      <label style={{ display: 'block', fontSize: 13, marginTop: 12, marginBottom: 6 }}>
        E-mail
      </label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu@email.com"
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
      />

      <label style={{ display: 'block', fontSize: 13, marginTop: 12, marginBottom: 6 }}>
        Senha
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type={showPwd ? 'text' : 'password'}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
        />
        <button
          type="button"
          onClick={() => setShowPwd((s) => !s)}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#f9fafb',
            cursor: 'pointer',
          }}
        >
          {showPwd ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      <button
        type="submit"
        style={{
          marginTop: 16,
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: 'none',
          background: '#1f2937',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Entrar
      </button>
    </form>
  );
}
