// frontend/src/services/gradeScheme.ts
export type Bimestre = 1 | 2 | 3 | 4;

export type GradeItem = {
  id?: string;
  nome: string;
  pontos: number; // 0–10
  tipo: "Prova" | "Trabalho" | "Projeto" | "Teste" | "Outros";
  cor?: string; // hex/rgb opcional
};

export type GradeScheme = {
  ano: number;
  itensPorBimestre: Record<Bimestre, GradeItem[]>;
};

export const DEFAULT_SCHEME = (ano: number): GradeScheme => ({
  ano,
  itensPorBimestre: { 1: [], 2: [], 3: [], 4: [] },
});

const API_BASE = ""; // se usar VITE_API_URL, troque por import.meta.env.VITE_API_URL ?? ""
const PATH = "/api/grade-scheme"; // >>> AJUSTE para o mesmo path do seu backend

async function safeJSON(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function fetchGradeScheme(ano: number): Promise<GradeScheme> {
  const url = `${API_BASE}${PATH}?ano=${encodeURIComponent(ano)}`;
  const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });

  // 404/204 => tratar como vazio, não lançar erro
  if (res.status === 404 || res.status === 204) {
    return DEFAULT_SCHEME(ano);
  }

  if (!res.ok) {
    // tente extrair mensagem da API, mas não quebre o app
    const body = await safeJSON(res);
    const apiMsg = body?.message || body?.error;
    throw new Error(apiMsg || "Falha ao carregar divisão de notas");
  }

  const data = await safeJSON(res);
  if (!data) return DEFAULT_SCHEME(ano);

  // Normalização defensiva
  const itensPorBimestre: GradeScheme["itensPorBimestre"] = { 1: [], 2: [], 3: [], 4: [] };
  for (const b of [1, 2, 3, 4] as Bimestre[]) {
    const arr = Array.isArray(data.itensPorBimestre?.[b]) ? data.itensPorBimestre[b] : [];
    itensPorBimestre[b] = arr.map((it: any) => ({
      id: it.id,
      nome: String(it.nome ?? ""),
      pontos: Number(it.pontos ?? 0),
      tipo: (it.tipo ?? "Outros") as GradeItem["tipo"],
      cor: it.cor ?? undefined,
    }));
  }

  return { ano: Number(data.ano ?? ano), itensPorBimestre };
}

export async function saveGradeScheme(payload: GradeScheme) {
  const res = await fetch(`${API_BASE}${PATH}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await safeJSON(res);
    const apiMsg = body?.message || body?.error;
    throw new Error(apiMsg || "Falha ao salvar divisão de notas");
  }

  return (await safeJSON(res)) ?? payload;
}
