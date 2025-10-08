#!/usr/bin/env node
/*
 * Smoke test de PDF
 * Uso:
 *  node frontend/scripts/smoke-pdf.cjs --essay <id>
 *  node frontend/scripts/smoke-pdf.cjs --url <https://...>
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--essay') out.essay = args[++i];
    else if (args[i] === '--url') out.url = args[++i];
  }
  out.essay = out.essay || process.env.SMOKE_PDF_ESSAY_ID;
  out.url = out.url || process.env.SMOKE_PDF_URL;
  return out;
}

function pickBaseUrl() {
  return process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || process.env.BASE_URL || '';
}

function fetchJson(url, { timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const ctl = new AbortController();
    const to = setTimeout(() => { ctl.abort(); reject(new Error('timeout')); }, timeout);
    fetch(url, { signal: ctl.signal, credentials: 'include' })
      .then(r => r.json().catch(() => ({})))
      .then(j => { clearTimeout(to); resolve(j); })
      .catch(e => { clearTimeout(to); reject(e); });
  });
}

async function resolveEssayUrl(essayId) {
  // 1) tentar endpoint file-token (GET) => { token }
  const base = pickBaseUrl();
  const full = `${base}/api/essays/${essayId}/file-token`;
  try {
    const r = await fetch(full, { credentials: 'include' });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      if (j?.url) return { url: j.url, via: 'token-url' };
      if (j?.token) return { url: `${base}/api/essays/${essayId}/file?token=${encodeURIComponent(j.token)}`, via: 'token' };
    } else {
      throw new Error(`file-token status ${r.status}`);
    }
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

async function fetchPdf(targetUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let mode = 'cookies';
  try {
    let res = await fetch(targetUrl, { credentials: 'include', signal: controller.signal });
    if (res.status === 401 || res.status === 403) {
      // tentar bearer se houver ?token=
      const u = new URL(targetUrl, 'http://localhost');
      const tokenQ = u.searchParams.get('token');
      if (tokenQ || process.env.SMOKE_PDF_BEARER) {
        mode = 'bearer';
        const token = process.env.SMOKE_PDF_BEARER || tokenQ;
        res = await fetch(u.origin + u.pathname, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      }
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!/pdf/i.test(ct)) throw new Error(`content-type inesperado: ${ct}`);
    let size = Number(res.headers.get('content-length') || 0);
    if (!size) {
      const buf = await res.arrayBuffer();
      size = buf.byteLength;
    }
    if (size <= 0) throw new Error('tamanho zero');
    if (size > 50 * 1024 * 1024) throw new Error('arquivo > 50MB (limite)');
    clearTimeout(timeout);
    console.log(`SMOKE OK: ${size} bytes, ${ct}, via ${mode}`);
    return 0;
  } catch (e) {
    clearTimeout(timeout);
    console.error('SMOKE FAIL:', e.message || e);
    return 1;
  }
}

async function main() {
  const args = parseArgs();
  let target = args.url;
  if (!target && !args.essay) {
    console.error('Uso: --essay <id> ou --url <https://...> (ou defina SMOKE_PDF_URL/SMOKE_PDF_ESSAY_ID)');
    process.exit(1);
  }
  if (!target && args.essay) {
    const { url, error } = await resolveEssayUrl(args.essay);
    if (error) {
      console.error('Falha ao resolver URL da redação:', error);
      process.exit(1);
    }
    target = url;
  }
  if (!/^https?:/i.test(target)) {
    // Montar base local se for relativo
    const base = pickBaseUrl() || '';
    target = base.replace(/\/$/, '') + target;
  }
  const code = await fetchPdf(target);
  process.exit(code);
}

main();