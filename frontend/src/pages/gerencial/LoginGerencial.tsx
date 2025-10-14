import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '@/components/auth/AuthShell';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { loginGerencial } from '@/services/gerencial.service';
import { useGerencialAuth } from '@/store/GerencialAuthContext';

export default function LoginGerencial() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setToken } = useGerencialAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErro(null);
    if (!senha.trim()) {
      setErro('Informe a senha gerencial.');
      return;
    }
    setLoading(true);
    try {
      const { token } = await loginGerencial(senha.trim());
      setToken(token);
      const next = params.get('next');
      navigate(next || '/gerencial', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível entrar.';
      setErro(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      roleLabel="Gerencial"
      heading="Acesso restrito"
      subheading="Digite a senha única para gerenciar professores."
      bullets={['Crie contas de professores', 'Atualize dados de contato', 'Revogue acessos quando necessário']}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Senha única"
          type="password"
          required
          value={senha}
          placeholder="••••••••"
          autoComplete="current-password"
          onChange={(event) => setSenha(event.target.value)}
        />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Verificando…' : 'Entrar na área gerencial'}
        </Button>
      </form>
      <div className="mt-4 text-xs text-ys-ink-3">
        Proteja esta senha. O token expira automaticamente após alguns minutos sem uso.
      </div>
    </AuthShell>
  );
}
