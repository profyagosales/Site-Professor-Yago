import { useEffect, useState } from 'react';
import { getSystemStatus, SystemStatus } from '@/services/systemStatusService';

export function SystemStatusBadge() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(()=> {
    let mounted = true;
    (async()=> {
      try {
        const data = await getSystemStatus();
        if (mounted) setStatus(data);
      } catch(e:any) {
        if (mounted) setError(e.message || 'falha status');
      }
    })();
    const id = setInterval(()=> setTick(t=>t+1), 15000);
    return ()=> { mounted = false; clearInterval(id); };
  }, []);

  if (error) return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-red-100 text-red-700">Status erro</span>;
  if (!status) return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-600">Status...</span>;

  const dbOk = status.dbConnected;
  const breaker = status.ai.breaker;
  const aiOk = !breaker?.open;
  const loginT = status.login?.teacher;

  function badgeColor(ok: boolean) {
    return ok ? 'bg-green-100 text-green-700 border-green-300' : 'bg-amber-100 text-amber-700 border-amber-300';
  }

  return (
    <div className="flex flex-wrap gap-2 items-center text-[11px]">
      <span className={`px-2 py-1 rounded-md border ${badgeColor(dbOk)}`}>DB {dbOk ? 'ON' : 'OFF'}</span>
      <span className={`px-2 py-1 rounded-md border ${badgeColor(aiOk)}`}>AI {aiOk ? 'OK' : 'BREAKER'}</span>
      {breaker?.open && (
        <span className="px-2 py-1 rounded-md border bg-amber-50 text-amber-700 border-amber-300">retry {(breaker.retryInMs/1000).toFixed(0)}s</span>
      )}
      {loginT && (
        <span className="px-2 py-1 rounded-md border bg-slate-100 text-slate-600 border-slate-300">Login OK {(loginT.successRate!=null?(loginT.successRate*100).toFixed(0)+'%':'—')}</span>
      )}
      <span className="text-slate-400">{new Date(status.timestamp).toLocaleTimeString()}</span>
    </div>
  );
}
