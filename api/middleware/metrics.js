const metrics = {
  http_requests_total: 0,
  http_requests_inflight: 0,
  http_request_duration_ms: [],
  pdf_generation_ms: [],
  emails_sent_total: 0,
  essay_status_transitions_total: 0
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
    essays:{ statusTransitions: metrics.essay_status_transitions_total }
  });
}
const trackPdfGeneration = ms => record(metrics.pdf_generation_ms, ms);
const incEmailSent = ()=> metrics.emails_sent_total +=1;
const incStatusTransition = ()=> metrics.essay_status_transitions_total +=1;
module.exports = { metricsMiddleware, exposeMetrics, trackPdfGeneration, incEmailSent, incStatusTransition };
