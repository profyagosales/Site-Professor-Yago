import { useState, useEffect } from 'react';
import { api, warmBackend } from '@/lib/api';

export default function LoginProfessor() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Aquecer o backend assim que a tela abre
    warmBackend();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login-teacher', {
        email,
        password: senha,
      });
      // Se chegou aqui, logou: redirecione
      // ajuste a rota de destino conforme seu app
      window.location.href = '/turmas';
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (err?.response?.status === 401
          ? 'E-mail ou senha inválidos.'
          : 'Falha ao entrar. Tente novamente.');
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl">
      {/* ... seu layout ... */}
      {erro && (
        <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </div>
      )}
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        placeholder="E-mail"
        className="input"
      />
      <input
        type="password"
        value={senha}
        onChange={e => setSenha(e.target.value)}
        required
        placeholder="Senha"
        className="input mt-3"
      />
      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary mt-4 w-full"
      >
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

