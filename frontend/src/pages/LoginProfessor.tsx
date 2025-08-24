import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginProfessor(){
  const nav = useNavigate();
  const [email,setEmail] = useState('');
  const [pass,setPass] = useState('');

  const submit = (e:React.FormEvent) => {
    e.preventDefault();
    // sua lógica de login…
  };

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-md rounded-2xl bg-white/70 ring-1 ring-[var(--ring)] backdrop-blur-sm p-6 md:p-7 shadow-[0_1px_0_rgba(255,255,255,.5),0_12px_24px_rgba(15,23,42,.06)]">
        <h1 className="text-xl font-bold text-slate-800">Login Professor</h1>
        <p className="text-[13px] text-slate-600 mt-1">
          Use seu e-mail e senha cadastrados.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-[13px] text-slate-700">E-mail</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300/70 bg-white px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-[var(--brand)]"
              value={email} onChange={e=>setEmail(e.target.value)} type="email" required
            />
          </label>

          <label className="block">
            <span className="text-[13px] text-slate-700">Senha</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300/70 bg-white px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-[var(--brand)]"
              value={pass} onChange={e=>setPass(e.target.value)} type="password" required
            />
          </label>

          <button
            type="submit"
            className="w-full mt-2 inline-flex items-center justify-center rounded-xl px-4 py-2.5 font-semibold text-white"
            style={{background:'var(--brand)'}}
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
