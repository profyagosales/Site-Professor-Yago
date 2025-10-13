// frontend/src/services/essays.service.ts// frontend/src/services/essays.service.ts

import api from '@/services/api';import api from '@/services/api';

import type { Anno } from '@/types/annotations';import type { Anno } from '@/types/annotations';

import type { EssaysPage, EssayStatus, Annotation } from '@/types/redacao';import type { EssaysPage, EssayStatus, Annotation } from '@/types/redacao';



/** -------- base helpers (sem hardcode de localhost) -------- *//** -------- base helpers (sem hardcode de localhost) -------- */

export function normalizeApiOrigin(origin?: string): string {export function normalizeApiOrigin(origin?: string): string {

  const env = (import.meta as any)?.env || {};  const env = (import.meta as any)?.env || {};

  let base = (origin || env?.VITE_API_BASE_URL || '').trim();  let base = (origin || env?.VITE_API_BASE_URL || '').trim();

  if (!base) base = typeof window !== 'undefined' ? `${window.location.origin}` : '';  if (!base) base = typeof window !== 'undefined' ? `${window.location.origin}` : '';

  base = base.replace(/\/+$/, '');  base = base.replace(/\/+$/, '');

  if (!/\/api$/i.test(base)) base += '/api';  if (!/\/api$/i.test(base)) base += '/api';

  return base;  return base;

}}



export function buildEssayFileUrl(essayId: string, token: string, origin?: string): string {export function buildEssayFileUrl(essayId: string, token: string, origin?: string): string {

  const u = new URL(`/essays/${essayId}/file`, normalizeApiOrigin(origin));  const u = new URL(`/essays/${essayId}/file`, normalizeApiOrigin(origin));

  u.searchParams.set('file-token', token);  u.searchParams.set('file-token', token);

  return u.toString();  return u.toString();

}}



/** -------- short token + PDF helpers -------- *//** -------- short token + PDF helpers -------- */

export async function getFileToken(essayId: string, options?: { signal?: AbortSignal }): Promise<string> {export async function getFileToken(essayId: string, options?: { signal?: AbortSignal }): Promise<string> {

  const { data } = await api.post(`/essays/${essayId}/file-token`, undefined, { signal: options?.signal });  const { data } = await api.post(`/essays/${essayId}/file-token`, undefined, { signal: options?.signal });

  return data?.token;  return data?.token;

}}



export async function prepareEssayFileToken(essayId: string, options?: { signal?: AbortSignal; apiOrigin?: string }) {export async function prepareEssayFileToken(essayId: string, options?: { signal?: AbortSignal; apiOrigin?: string }) {

  const token = await getFileToken(essayId, { signal: options?.signal });  const token = await getFileToken(essayId, { signal: options?.signal });

  return buildEssayFileUrl(essayId, token, options?.apiOrigin);  return buildEssayFileUrl(essayId, token, options?.apiOrigin);

}}



export async function fetchEssayPdfUrl(export async function fetchEssayPdfUrl(

  essayId: string,  essayId: string,

  options?: { signal?: AbortSignal; apiOrigin?: string }  options?: { signal?: AbortSignal; apiOrigin?: string }

): Promise<string> {): Promise<string> {

  const preparedUrl = await prepareEssayFileToken(essayId, options);  const preparedUrl = await prepareEssayFileToken(essayId, options);

  const res = await fetch(preparedUrl, {  const res = await fetch(preparedUrl, {

    method: 'GET',    method: 'GET',

    credentials: 'omit',    credentials: 'omit',

    cache: 'no-store',    cache: 'no-store',

    signal: options?.signal,    signal: options?.signal,

    redirect: 'follow',    redirect: 'follow',

  });  });

  if (!res.ok) {  if (!res.ok) {

    const error = new Error(`HTTP ${res.status}`) as Error & { status?: number };    const error = new Error(`HTTP ${res.status}`) as Error & { status?: number };

    error.status = res.status;    error.status = res.status;

    throw error;    throw error;

  }  }

  const blob = await res.blob();  const blob = await res.blob();

  return URL.createObjectURL(blob);  return URL.createObjectURL(blob);

}}



/** -------- essays CRUD/list -------- *//** -------- essays CRUD/list -------- */

export async function fetchEssaysPage(params: {export async function fetchEssaysPage(params: {

  status?: EssayStatus;  status?: EssayStatus;

  page?: number;  page?: number;

  limit?: number;  limit?: number;

  q?: string;  q?: string;

}): Promise<EssaysPage> {}): Promise<EssaysPage> {

  const { data } = await api.get('/essays', { params });  const { data } = await api.get('/essays', { params });

  return data;  return data;

}}



export async function createEssay(form: FormData) {export async function createEssay(form: FormData) {

  const { data } = await api.post('/essays', form, { headers: { 'Content-Type': 'multipart/form-data' } });  const { data } = await api.post('/essays', form, { headers: { 'Content-Type': 'multipart/form-data' } });

  return data;  return data;

}}



export async function updateEssay(id: string, form: FormData) {export async function updateEssay(id: string, form: FormData) {

  const { data } = await api.put(`/essays/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });  const { data } = await api.put(`/essays/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });

  return data;  return data;

}}



/** -------- notas/correção -------- *//** -------- notas/correção -------- */

export async function gradeEssay(id: string, payload: any) {export async function gradeEssay(id: string, payload: any) {

  const { data } = await api.patch(`/essays/${id}/grade`, payload);  const { data } = await api.patch(`/essays/${id}/grade`, payload);

  return data;  return data;

}}



export async function renderCorrection(id: string, payload?: any) {export async function renderCorrection(id: string, payload?: any) {

  const { data } = await api.post(`/essays/${id}/render-correction`, payload || {});  const { data } = await api.post(`/essays/${id}/render-correction`, payload || {});

  return data;  return data;

}}



/** -------- anotações --------/** -------- anotações --------

 * IMPORTANTÍSSIMO: SEM localhost, SEM /redacoes – tudo via axios `api` com cookies. */ * IMPORTANTÍSSIMO: SEM localhost, SEM /redacoes – tudo via axios `api` com cookies. */

export async function saveAnnotations(export async function saveAnnotations(

  id: string,  id: string,

  annotations: Annotation[],  annotations: Annotation[],

  opts?: { annos?: Anno[] }  opts?: { annos?: Anno[] }

) {) {

  const body: any = { annotations };  const body: any = { annotations };

  if (opts?.annos && (window as any).YS_USE_RICH_ANNOS) {  if (opts?.annos && (window as any).YS_USE_RICH_ANNOS) {

    body.richAnnotations = opts.annos;    body.richAnnotations = opts.annos;

  }  }

  const { data } = await api.put(`/essays/${id}/annotations`, body);  const { data } = await api.put(`/essays/${id}/annotations`, body);

  return data;  return data;

}}



/** Mantemos o nome para quem ainda importa `updateEssayAnnotations`,/** Mantemos o nome para quem ainda importa `updateEssayAnnotations`,

 * mas agora é só um PATCH pelo mesmo client axios (com credenciais). * mas agora é só um PATCH pelo mesmo client axios (com credenciais).

 * Nada de `http://localhost:5050`. */ * Nada de `http://localhost:5050`. */

export async function updateEssayAnnotations(export async function updateEssayAnnotations(

  id: string,  id: string,

  payload: { richAnnotations?: Anno[]; rich?: Anno[] }  payload: { richAnnotations?: Anno[]; rich?: Anno[] }

) {) {

  const body: any = {};  const body: any = {};

  if (Array.isArray(payload.richAnnotations)) body.richAnnotations = payload.richAnnotations;  if (Array.isArray(payload.richAnnotations)) body.richAnnotations = payload.richAnnotations;

  else if (Array.isArray(payload.rich)) body.richAnnotations = payload.rich;  else if (Array.isArray(payload.rich)) body.richAnnotations = payload.rich;

  else body.richAnnotations = [];  else body.richAnnotations = [];



  const { data } = await api.patch(`/essays/${id}/annotations`, body);  const { data } = await api.patch(`/essays/${id}/annotations`, body);

  return data;  return data;

}}



/** -------- util compat (ainda usado em alguns pontos do UI) -------- *//** -------- util compat (ainda usado em alguns pontos do UI) -------- */

export async function getThemes(params?: { type?: 'ENEM' | 'PAS'; active?: boolean }) {export async function getThemes(params?: { type?: 'ENEM' | 'PAS'; active?: boolean }) {

  const res = await api.get('/essays/themes', { params });  const res = await api.get('/essays/themes', { params });

  return res.data;  return res.data;

}}

