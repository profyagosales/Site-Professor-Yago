import { useEffect, useState } from 'react';
import { getMetricsSummary, MetricsSummary } from '@/services/metricsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Activity, Clock, BarChart3, TrendingUp, ShieldCheck, Brain } from 'lucide-react';

function formatHours(h: number | null) {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h/24).toFixed(1)}d`;
}

function Sparkline({ data }: { data: { day: string; count: number }[] }) {
  if (!data.length) return <span className="text-xs text-muted-foreground">sem dados</span>;
  const max = Math.max(...data.map(d => d.count));
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map(d => (
        <div key={d.day} title={`${d.day}: ${d.count}`}
          className="bg-blue-500/70 rounded-sm"
          style={{ height: `${(d.count / max) * 100}%`, width: '10px' }} />
      ))}
    </div>
  );
}

export function DashboardMetricsWidget() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getMetricsSummary();
        if (mounted) setMetrics(data);
      } catch (e: any) {
        if (mounted) setError(e.message || 'Erro ao carregar métricas');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader><CardTitle>Métricas</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando métricas...</CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="mt-6">
        <CardHeader><CardTitle>Métricas</CardTitle></CardHeader>
        <CardContent className="text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }
  if (!metrics) return null;

  const { totals, essays, performance, queue, ratios, ai, login } = metrics;

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-6 gap-4">
      <Card className="col-span-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Totais</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          <div><span className="font-medium">Alunos:</span> {totals.students}</div>
          <div><span className="font-medium">Turmas:</span> {totals.classes}</div>
            <div><span className="font-medium">Temas ativos:</span> {totals.themes}</div>
          <div className="pt-2 border-t text-[11px] text-muted-foreground">Gerado {new Date(metrics.generatedAt).toLocaleTimeString()}</div>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Status</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          <div>Pendentes: {essays.byStatus.PENDING}</div>
          <div>Em correção: {essays.byStatus.GRADING}</div>
          <div>Corrigidas: {essays.byStatus.GRADED}</div>
          <div>Enviadas: {essays.byStatus.SENT}</div>
          <div className="pt-1 text-[11px] text-muted-foreground">Total: {essays.total}</div>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Performance</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          <div>Média correção: {formatHours(performance.avgCorrectionTimeHours)}</div>
          <div>Mediana correção: {formatHours(performance.medianCorrectionTimeHours)}</div>
          <div>Idade pendentes: {formatHours(queue.pendingAgingHours)}</div>
          <div>Correções em andamento: {queue.gradingInProgress}</div>
          <div className="pt-1 border-t text-[11px] text-muted-foreground">AI gen avg: {performance.aiGenerationMs.avg ?? '—'}ms p50:{performance.aiGenerationMs.p50 ?? '—'} p95:{performance.aiGenerationMs.p95 ?? '—'}</div>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 7 dias</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-3">
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">Criadas</div>
            <Sparkline data={essays.last7d.created} />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">Corrigidas</div>
            <Sparkline data={essays.last7d.graded} />
          </div>
          <div className="flex gap-4 text-[11px] pt-1 border-t">
            <div>Taxa corr: {ratios.correctionRate7d == null ? '—' : (ratios.correctionRate7d * 100).toFixed(0)+'%'}</div>
            <div>Pend/Grd: {ratios.pendingToGraded == null ? '—' : ratios.pendingToGraded}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" /> IA</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          <div>Sugestões: {ai.suggestionsTotal}</div>
          <div>Aplicadas: {ai.appliedTotal}</div>
          <div>Adopção: {ai.adoptionRate == null ? '—' : (ai.adoptionRate*100).toFixed(0)+'%'}</div>
          <div className="pt-1 text-[11px] text-muted-foreground">Últimos 7d: {ai.suggestions7d.reduce((a,b)=>a+b.count,0)} geradas</div>
        </CardContent>
      </Card>

      {login && (
        <Card className="col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Logins</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="text-[11px] uppercase text-muted-foreground">Professor</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-green-600" title="Sucesso">{login.teacher.success}</div>
              <div className="text-amber-600" title="401">{login.teacher.unauthorized}</div>
              <div className="text-red-600" title="503">{login.teacher.unavailable}</div>
            </div>
            <div className="text-[10px] text-muted-foreground">Taxa sucesso: {login.teacher.successRate==null?'—':(login.teacher.successRate*100).toFixed(0)+'%'}</div>
            <div className="text-[11px] uppercase text-muted-foreground pt-2">Aluno</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-green-600" title="Sucesso">{login.student.success}</div>
              <div className="text-amber-600" title="401">{login.student.unauthorized}</div>
              <div className="text-red-600" title="503">{login.student.unavailable}</div>
            </div>
            <div className="text-[10px] text-muted-foreground">Taxa sucesso: {login.student.successRate==null?'—':(login.student.successRate*100).toFixed(0)+'%'}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
