import React, { useState } from 'react';

export default function LoginAluno(){
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [err, setErr] = useState<string|null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try{
      // ... sua chamada de login
    }catch(e:any){
      setErr('Falha ao fazer login. Tente novamente.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-14">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-6" style={{color:'#ff6a00'}}>Login Aluno</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="field" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="field" placeholder="Senha" type="password" value={senha} onChange={e=>setSenha(e.target.value)} />
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button className="btn-brand w-full" type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
}
