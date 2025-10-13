const express = require('express');
const { parse } = require('path-to-regexp');

function normalizePath(p) {
  if (!p || p instanceof RegExp) return p;
  if (typeof p !== 'string') return p;
  if (p === '*' || p === '/*') return '*';
  try {
    if (/^https?:\/\//i.test(p)) {
      const pathname = new URL(p).pathname || '/';
      return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    }
    const s = p.startsWith('/') ? p : `/${p}`;
    return s.endsWith('/') && s !== '/' ? s.slice(0, -1) : s;
  } catch {
    return p;
  }
}

function patch(proto, method) {
  const orig = proto[method];
  proto[method] = function (path, ...handlers) {
    let fixed = path;
    if (typeof path === 'string') {
      const before = path;
      fixed = normalizePath(before);

      if (fixed === '*') {
        return orig.call(this, fixed, ...handlers);
      }

      if (/[()*?+]|\\/.test(fixed)) {
        console.error(`[route] ⚠️ padrão com metacaracteres em string para ${method}: "${before}"`);
        console.error('        Use um RegExp literal: ex.: app.all(/^\\/api\\/foo(.*)$/i, ...)');
        try { parse(fixed); } catch (e) {
          console.error(`[route] ❌ inválido: "${before}" (normalizado: "${fixed}")`);
          throw e;
        }
      }

      try { parse(fixed); } catch (e) {
        console.error(`[route] ❌ inválido: "${before}" (normalizado: "${fixed}")`);
        throw e;
      }
    }
    try {
      return orig.call(this, fixed, ...handlers);
    } catch (err) {
      console.error(`[route] ❌ falha ao registrar ${method} para`, fixed);
      throw err;
    }
  };
}

function install() {
  const methods = ['use','all','get','post','put','patch','delete','options','head'];
  methods.forEach(m => patch(express.application, m));
  methods.forEach(m => patch(express.Router && express.Router, m));
}

module.exports = { install, normalizePath };
