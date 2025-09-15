const metrics = {
  http_requests_total: 0,
  http_requests_inflight: 0,
  http_request_duration_ms: [],
  pdf_generation_ms: [],
  emails_sent_total: 0,
  essay_status_transitions_total: 0,
  auth_health_calls_total: 0,
  auth_cookie_echo_success_total: 0,
  auth_cookie_echo_miss_total: 0
};
const MAX_BUCKET = 200;
function record(arr, v){ arr.push(v); if(arr.length>MAX_BUCKET) arr.shift(); }
function metricsMiddleware(req,res,next){
  metrics.http_requests_total +=1;
  metrics.http_requests_inflight +=1;
  const start = process.hrtime.bigint();
  res.on('finish', ()=>{
    const end = process.hrtime.bigint();
    record(metrics.http_request_duration_ms, Number(end-start)/1e6);
    metrics.http_requests_inflight -=1;
  });
  next();
}
function exposeMetrics(req,res){
  const avg = a=> a.length? a.reduce((s,x)=>s+x,0)/a.length:0;
  res.json({
    http:{ total:metrics.http_requests_total, inflight:metrics.http_requests_inflight, avgMs:Number(avg(metrics.http_request_duration_ms).toFixed(2)) },
    pdf:{ avgMs:Number(avg(metrics.pdf_generation_ms).toFixed(2)), samples: metrics.pdf_generation_ms.length },
    emails:{ sent: metrics.emails_sent_total },
    essays:{ statusTransitions: metrics.essay_status_transitions_total },
    auth:{
      healthCalls: metrics.auth_health_calls_total,
      cookieEchoSuccess: metrics.auth_cookie_echo_success_total,
      cookieEchoMiss: metrics.auth_cookie_echo_miss_total
    }
  });
}
function exposeMetricsProm(req,res){
  const avg = a=> a.length? a.reduce((s,x)=>s+x,0)/a.length:0;
  const lines = [];
  const push = l=> lines.push(l);
  push('# HELP app_http_requests_total Total de requisições HTTP');
  push('# TYPE app_http_requests_total counter');
  push(`app_http_requests_total ${metrics.http_requests_total}`);
  push('# HELP app_http_requests_inflight Requisições em andamento');
  push('# TYPE app_http_requests_inflight gauge');
  push(`app_http_requests_inflight ${metrics.http_requests_inflight}`);
  push('# HELP app_http_request_duration_ms_avg Média móvel (ms) das durações recentes');
  push('# TYPE app_http_request_duration_ms_avg gauge');
  push(`app_http_request_duration_ms_avg ${avg(metrics.http_request_duration_ms).toFixed(2)}`);
  push('# HELP app_pdf_generation_ms_avg Tempo médio geração PDF (ms)');
  push('# TYPE app_pdf_generation_ms_avg gauge');
  push(`app_pdf_generation_ms_avg ${avg(metrics.pdf_generation_ms).toFixed(2)}`);
  push('# HELP app_emails_sent_total Total de emails enviados');
  push('# TYPE app_emails_sent_total counter');
  push(`app_emails_sent_total ${metrics.emails_sent_total}`);
  push('# HELP app_essay_status_transitions_total Transições de status de redação');
  push('# TYPE app_essay_status_transitions_total counter');
  push(`app_essay_status_transitions_total ${metrics.essay_status_transitions_total}`);
  push('# HELP app_auth_health_calls_total Chamadas ao endpoint /auth/health');
  push('# TYPE app_auth_health_calls_total counter');
  push(`app_auth_health_calls_total ${metrics.auth_health_calls_total}`);
  push('# HELP app_auth_cookie_echo_success_total Cookie probe retornou');
  push('# TYPE app_auth_cookie_echo_success_total counter');
  push(`app_auth_cookie_echo_success_total ${metrics.auth_cookie_echo_success_total}`);
  push('# HELP app_auth_cookie_echo_miss_total Cookie probe não retornou');
  push('# TYPE app_auth_cookie_echo_miss_total counter');
  push(`app_auth_cookie_echo_miss_total ${metrics.auth_cookie_echo_miss_total}`);
  res.set('Content-Type','text/plain; version=0.0.4');
  res.send(lines.join('\n') + '\n');
}
const trackPdfGeneration = ms => record(metrics.pdf_generation_ms, ms);
const incEmailSent = ()=> metrics.emails_sent_total +=1;
const incStatusTransition = ()=> metrics.essay_status_transitions_total +=1;
const incAuthHealthCall = ()=> metrics.auth_health_calls_total +=1;
const incAuthCookieEchoSuccess = ()=> metrics.auth_cookie_echo_success_total +=1;
const incAuthCookieEchoMiss = ()=> metrics.auth_cookie_echo_miss_total +=1;
module.exports = { metricsMiddleware, exposeMetrics, exposeMetricsProm, trackPdfGeneration, incEmailSent, incStatusTransition, incAuthHealthCall, incAuthCookieEchoSuccess, incAuthCookieEchoMiss };
