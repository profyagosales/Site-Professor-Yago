// frontend/src/services/gradeScheme.ts
import { api } from './api';

export type Bimestre = 1 | 2 | 3 | 4;

export type GradeItem = {
  id?: string;
  nome: string;
  pontos: number; // 0–10
  tipo: 'Prova' | 'Trabalho' | 'Projeto' | 'Teste' | 'Outros';
  cor?: string; // hex/rgb opcional
};

export type GradeScheme = {
  ano: number;
  itensPorBimestre: Record<Bimestre, GradeItem[]>;
};

const BIMESTRES: Bimestre[] = [1, 2, 3, 4];
const DEFAULT_COLOR = '#F59E0B';
const CANDIDATES = ['/api/grade-scheme', '/api/gradescheme', '/api/professor/grade-scheme'];

export const DEFAULT_SCHEME = (ano: number): GradeScheme => ({
  ano,
  itensPorBimestre: { 1: [], 2: [], 3: [], 4: [] },
});

export async function fetchGradeScheme(ano: number): Promise<GradeScheme> {
  const params = { ano, year: ano };

  for (const base of CANDIDATES) {
    try {
      const { data } = await api.get(base, {
        params,
        headers: { Accept: 'application/json' },
        meta: { noCache: true },
      });
      return normalizeResponse(data, ano);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 204) {
        continue; // tente próxima rota candidata
      }
      throw wrapServiceError(err, 'Falha ao carregar divisão de notas');
    }
  }

  return DEFAULT_SCHEME(ano);
}

export async function saveGradeScheme(payload: GradeScheme) {
  const body = denormalizePayload(payload);
  let lastNotFound = false;

  for (const base of CANDIDATES) {
    try {
      const { data } = await api.put(base, body, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });
      return normalizeResponse(data ?? {}, payload.ano);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        lastNotFound = true;
        continue;
      }
      throw wrapServiceError(err, 'Falha ao salvar divisão de notas');
    }
  }

  if (lastNotFound) {
    throw new Error('API route not found');
  }

  return payload;
}

function normalizeResponse(raw: any, fallbackYear: number): GradeScheme {
  const source = raw?.data ?? raw?.payload ?? raw?.scheme ?? raw;
  const ano = normalizeYear([source?.ano, source?.year, raw?.ano, raw?.year], fallbackYear);
  const scheme: GradeScheme = { ano, itensPorBimestre: { 1: [], 2: [], 3: [], 4: [] } };

  const objectCandidates = [
    source?.itensPorBimestre,
    source?.itemsByBimester,
    source?.bimestres,
    source?.bimesters,
    source,
  ];

  let filled = false;
  for (const candidate of objectCandidates) {
    if (fillFromObject(candidate, scheme)) {
      filled = true;
    }
  }

  if (!filled) {
    const arrayCandidates = [
      source?.itens,
      source?.items,
      source?.data,
      Array.isArray(source) ? source : null,
    ].filter(Boolean) as any[];

    for (const candidate of arrayCandidates) {
      if (Array.isArray(candidate)) {
        candidate.forEach((entry) => {
          if (fillFromArrayEntry(entry, scheme)) {
            filled = true;
          }
        });
      }
    }
  }

  if (!filled) {
    return DEFAULT_SCHEME(ano);
  }

  return scheme;
}

function fillFromObject(candidate: any, scheme: GradeScheme): boolean {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }
  let updated = false;
  for (const bimestre of BIMESTRES) {
    const items =
      candidate[bimestre] ??
      candidate[String(bimestre)] ??
      candidate[`b${bimestre}`] ??
      candidate[`bim${bimestre}`] ??
      candidate[`bimester${bimestre}`];

    if (Array.isArray(items)) {
      scheme.itensPorBimestre[bimestre] = normalizeItems(items);
      updated = true;
    }
  }
  return updated;
}

function fillFromArrayEntry(entry: any, scheme: GradeScheme): boolean {
  if (!entry || typeof entry !== 'object') {
    return false;
  }
  const bimValue =
    entry.bimestre ??
    entry.bimester ??
    entry.term ??
    entry.numero ??
    entry.number ??
    entry.b;
  const bim = Number(bimValue);
  if (!BIMESTRES.includes(bim as Bimestre)) {
    return false;
  }
  const itemsSource =
    entry.items ??
    entry.itens ??
    entry.data ??
    entry.lista ??
    entry.activities ??
    entry.atividades ??
    entry.avaliacoes ??
    entry.gradeItems ??
    entry;
  const items = Array.isArray(itemsSource) ? itemsSource : [];
  scheme.itensPorBimestre[bim as Bimestre] = normalizeItems(items);
  return true;
}

function normalizeItems(items: any[]): GradeItem[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => normalizeItem(item)).filter(Boolean) as GradeItem[];
}

function normalizeItem(entry: any): GradeItem | null {
  const source = entry?.item ?? entry;
  if (!source || typeof source !== 'object') {
    return null;
  }

  const nome = firstString([
    source.nome,
    source.name,
    source.titulo,
    source.title,
    source.label,
    source.descricao,
  ]);
  const pontos = normalizePoints(source.pontos ?? source.points ?? source.valor ?? source.score);
  const tipo = normalizeType(source.tipo ?? source.type ?? source.categoria ?? source.category);
  const cor = normalizeColor(source.cor ?? source.color ?? source.badge ?? source.hex);
  const id = firstString([source.id, source._id, source.uuid]);

  return {
    id: id || undefined,
    nome: nome ?? '',
    pontos,
    tipo,
    cor: cor ?? undefined,
  };
}

function normalizePoints(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value);
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(',', '.');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeType(value: unknown): GradeItem['tipo'] {
  if (typeof value !== 'string') {
    return 'Prova';
  }
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'trabalho':
    case 'trabalhos':
      return 'Trabalho';
    case 'projeto':
    case 'projetos':
      return 'Projeto';
    case 'teste':
    case 'testes':
    case 'quiz':
      return 'Teste';
    case 'outros':
    case 'outro':
    case 'diverso':
    case 'diversos':
      return 'Outros';
    case 'prova':
    case 'provas':
    default:
      return 'Prova';
  }
}

function normalizeColor(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return DEFAULT_COLOR;
}

function normalizeYear(values: Array<unknown>, fallback: number): number {
  for (const value of values) {
    const num = Number(value);
    if (Number.isInteger(num) && num >= 2000 && num <= 2200) {
      return num;
    }
  }
  return fallback;
}

function firstString(values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function denormalizePayload(scheme: GradeScheme) {
  const itens: Record<Bimestre, any[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const bim of BIMESTRES) {
    itens[bim] = (scheme.itensPorBimestre[bim] ?? []).map((item, index) => ({
      id: item.id,
      nome: item.nome ?? '',
      name: item.nome ?? '',
      label: item.nome ?? '',
      pontos: Number(item.pontos ?? 0),
      points: Number(item.pontos ?? 0),
      tipo: item.tipo,
      type: item.tipo,
      cor: item.cor ?? DEFAULT_COLOR,
      color: item.cor ?? DEFAULT_COLOR,
      order: index,
    }));
  }

  return {
    ano: scheme.ano,
    year: scheme.ano,
    itensPorBimestre: itens,
    itemsByBimester: itens,
    bimestres: itens,
  };
}

function wrapServiceError(error: any, fallback: string): Error {
  const message =
    firstString([
      error?.response?.data?.message,
      error?.response?.data?.error,
      error?.message,
    ]) ?? fallback;
  return new Error(message);
}
