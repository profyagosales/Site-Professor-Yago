import { useState } from 'react';
import api from '../services/api';

export default function DebugAuthPage() {
  const [output, setOutput] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function call(path: string) {
    try {
      const res = await api.get(path);
      setOutput({ path, data: res.data });
    } catch (e: any) {
      const status = e?.response?.status;
      const diagnosticsOff = status === 404 || status === 403;
      setOutput({ path, error: e.message, status, diagnosticsOff, details: e?.response?.data });
    }
  }

  async function loginTeacher() {
    try {
      const res = await api.post('/auth/login/teacher', { email, password });
      setOutput({ path: 'loginTeacher', data: res.data });
    } catch (e: any) {
      setOutput({ path: 'loginTeacher', error: e.message, details: e?.response?.data });
    }
  }

  function dumpCookies() {
    setOutput({ path: 'document.cookie', data: document.cookie });
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Debug Autenticação</h1>
      {output?.diagnosticsOff && (
        <div className="p-2 bg-yellow-100 border text-sm">
          Rotas de diagnóstico parecem desativadas (defina DIAGNOSTICS_ENABLED=true no backend para habilitar).
        </div>
      )}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <button className="border px-2 py-1" onClick={() => call('/auth/cookie-options')}>/auth/cookie-options</button>
          <button className="border px-2 py-1" onClick={() => call('/auth/set-cookie-variants')}>/auth/set-cookie-variants</button>
          <button className="border px-2 py-1" onClick={() => call('/auth/set-raw-cookie')}>/auth/set-raw-cookie</button>
          <button className="border px-2 py-1" onClick={() => call('/auth/cookie-test')}>/auth/cookie-test</button>
          <button className="border px-2 py-1" onClick={() => call('/auth/debug-session')}>/auth/debug-session</button>
          <button className="border px-2 py-1" onClick={() => call('/auth/me-test')}>/auth/me-test</button>
          <button className="border px-2 py-1" onClick={() => dumpCookies()}>document.cookie</button>
        </div>
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex flex-col">
            <label className="text-sm">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className="border px-2 py-1" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="border px-2 py-1" />
          </div>
          <button className="border px-2 py-1" onClick={loginTeacher}>Login Teacher</button>
        </div>
      </div>
      <pre className="bg-gray-100 p-2 text-xs overflow-auto max-h-[50vh]">{output ? JSON.stringify(output, null, 2) : 'Sem saída ainda'}</pre>
    </div>
  );
}
