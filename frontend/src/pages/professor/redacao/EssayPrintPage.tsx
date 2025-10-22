import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import PdfPrintPreview from '@/components/redacao/PdfPrintPreview';
import type { AnnotationItem } from '@/components/redacao/annotationTypes';
import { HIGHLIGHT_CATEGORIES, type HighlightCategoryKey } from '@/constants/annotations';
import {
  fetchEssayById,
  getEssayAnnotations,
  getEssayScore,
  issueFileToken,
  peekEssayFile,
} from '@/services/essays.service';
import type { EssayAnnotationPayload } from '@/services/essays.service';
import { hexToRgba } from '@/utils/color';
import { ENEM_2024 } from '@/features/essay/rubrics/enem2024';
import type { RubricCriterion, RubricGroup } from '@/features/essay/rubrics/enem2024';
import './PrintPage.css';

type EssayScorePayload = Awaited<ReturnType<typeof getEssayScore>>;

type CommentKind = 'argumentacao' | 'gramatica' | 'coesao' | 'apresentacao' | 'geral';

type NormalizedComment = {
  id: string;
  number: number;
  kind: CommentKind;
  label: string;
  color: string;
  page: number;
  text: string;
};

type CompetencyKey = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

type EnemSelections = {
  levels: number[];
  reasons: string[][];
};

const MAX_COMMENTS_PAGE1 = 8;
const POINTS_PER_LEVEL = [0, 40, 80, 120, 160, 200];

type PasMacroKey = 'apresentacao' | 'consistencia' | 'generoTextual' | 'coesaoCoerencia';
type PasErrorKey = 'grafiaAcentuacao' | 'pontuacaoMorfossintaxe' | 'propriedadeVocabular';

const PAS_MACRO_CONFIG: Array<{
  key: PasMacroKey;
  label: string;
  range: string;
  min: number;
  max: number;
  decimals: number;
}> = [
  { key: 'apresentacao', label: 'Apresentação', range: '0,00 – 0,50', min: 0, max: 0.5, decimals: 2 },
  {
    key: 'consistencia',
    label: 'Consistência da argumentação e progressão temática',
    range: '0,00 – 4,50',
    min: 0,
    max: 4.5,
    decimals: 2,
  },
  {
    key: 'generoTextual',
    label: 'Adequação ao tipo/gênero textual',
    range: '0,00 – 2,00',
    min: 0,
    max: 2,
    decimals: 2,
  },
  {
    key: 'coesaoCoerencia',
    label: 'Coesão e coerência',
    range: '0,00 – 3,00',
    min: 0,
    max: 3,
    decimals: 2,
  },
];

const PAS_ERROR_CONFIG: Array<{ key: PasErrorKey; label: string }> = [
  { key: 'grafiaAcentuacao', label: 'Grafia / Acentuação' },
  { key: 'pontuacaoMorfossintaxe', label: 'Pontuação / Morfossintaxe' },
  { key: 'propriedadeVocabular', label: 'Propriedade vocabular' },
];

const CATEGORY_KIND_MAP: Record<HighlightCategoryKey, CommentKind> = {
  argumentacao: 'argumentacao',
  ortografia: 'gramatica',
  coesao: 'coesao',
  apresentacao: 'apresentacao',
  comentarios: 'geral',
};

const COMMENT_KIND_META: Record<CommentKind, { label: string; color: string }> = {
  argumentacao: { label: 'Argumentação', color: '#FFE6A6' },
  gramatica: { label: 'Ortografia/Gramática', color: '#D6F5D6' },
  coesao: { label: 'Coesão/Coerência', color: '#D6E9FF' },
  apresentacao: { label: 'Apresentação', color: '#FFE0C2' },
  geral: { label: 'Comentários gerais', color: '#FFD6D6' },
};

const COMPETENCY_TITLES: Record<CompetencyKey, string> = {
  C1: 'Domínio da norma padrão da língua portuguesa',
  C2: 'Compreensão da proposta de redação e aplicação de conceitos de outras áreas',
  C3: 'Organização e defesa de argumentos',
  C4: 'Conhecimento dos mecanismos linguísticos para a argumentação (coesão)',
  C5: 'Elaboração de proposta de intervenção social para o problema abordado',
};

const ENEM_REASON_LABELS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const visit = (node: RubricGroup | RubricCriterion | undefined) => {
    if (!node) return;
    if ('items' in node) {
      node.items.forEach((child) => visit(child as RubricGroup | RubricCriterion));
      return;
    }
    if (node.id) {
      map[node.id] = node.label;
    }
  };
  ENEM_2024.forEach((competency) => {
    competency.levels.forEach((level) => visit(level.rationale));
  });
  return map;
})();

const COMPETENCY_BASE_TEXTS: Record<CompetencyKey, string[]> = {
  C1: [
    'Estrutura sintática inexistente.',
    'Estrutura sintática deficitária COM muitos desvios.',
    'Estrutura sintática deficitária OU muitos desvios.',
    'Estrutura sintática regular E alguns desvios.',
    'Estrutura sintática boa E poucos desvios.',
    'Estrutura sintática excelente (≤ 1 falha) E ≤ 2 desvios.',
  ],
  C2: [
    'Tangência ao tema OU aglomerado caótico de palavras OU traços de outros tipos textuais.',
    'Tangência ao tema OU aglomerado caótico de palavras OU traços de outros tipos textuais.',
    'Abordagem completa E 3 partes (2 embrionárias) OU conclusão por frase incompleta.',
    'Abordagem completa E 3 partes (1 embrionária) E repertório baseado nos textos motivadores E/OU repertório não legitimado E/OU repertório legitimado MAS não pertinente ao tema.',
    'Abordagem completa E 3 partes (nenhuma embrionária) E repertório legitimado E pertinente, SEM uso produtivo.',
    'Abordagem completa E 3 partes (nenhuma embrionária) E repertório legitimado E pertinente, COM uso produtivo.',
  ],
  C3: [
    'Aglomerado caótico de palavras.',
    'Projeto sem foco temático ou distorcido.',
    'Projeto com MUITAS falhas E desenvolvimento ausente/parcial.',
    'Projeto com ALGUMAS falhas E desenvolvimento com ALGUMAS lacunas.',
    'Projeto com POUCAS falhas E desenvolvimento com POUCAS lacunas.',
    'Projeto estratégico E desenvolvimento em TODO o texto.',
  ],
  C4: [
    'Ausência de articulação; palavras E/OU períodos desconexos.',
    'RARA coesão intra/inter E/OU EXCESSIVAS repetições/inadequações.',
    'PONTUAL coesão intra/inter E/OU MUITAS repetições/inadequações.',
    'REGULAR coesão intra/inter E/OU ALGUMAS repetições/inadequações.',
    'CONSTANTE coesão intra/inter E/OU POUCAS repetições/inadequações.',
    'EXPRESSIVA coesão intra/inter; RARAS/AUSENTES repetições; SEM inadequações.',
  ],
  C5: [
    'Ausência de proposta OU desrespeito aos direitos humanos OU fora do assunto.',
    'Tangência ao tema OU elementos nulos OU 1 elemento válido.',
    '2 elementos válidos.',
    '3 elementos válidos.',
    '4 elementos válidos.',
    '5 elementos válidos.',
  ],
};

function formatNumber(value: number | null | undefined, decimals = 2, fallback = '—') {
  if (value == null || Number.isNaN(value)) return fallback;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function parseNumber(...candidates: Array<unknown>): number | null {
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const num = Number(candidate);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeAnnotations(payload: EssayAnnotationPayload[]): AnnotationItem[] {
  return payload
    .map((raw, index) => {
      const category = (raw?.category || 'argumentacao') as HighlightCategoryKey;
      const rectsRaw = Array.isArray(raw?.rects) ? raw.rects : [];
      const rects = rectsRaw
        .map((rect) => ({
          x: Number(rect?.x) || 0,
          y: Number(rect?.y) || 0,
          width: Number(rect?.w ?? rect?.width) || 0,
          height: Number(rect?.h ?? rect?.height) || 0,
        }))
        .filter((rect) => rect.width > 0 && rect.height > 0);
      if (!rects.length) return null;
      return {
        id: String(raw.id || raw._id || `${category}-${index}`),
        page: Number(raw.page) || 1,
        rects,
        category,
        comment: typeof raw.comment === 'string' ? raw.comment : '',
        color: HIGHLIGHT_CATEGORIES[category]?.color ?? '#FFE6A6',
        number: Number(raw.number) || index + 1,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      } satisfies AnnotationItem;
    })
    .filter(Boolean) as AnnotationItem[];
}

function renumber(annotations: AnnotationItem[]) {
  return annotations
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((ann, index) => ({ ...ann, number: index + 1 }));
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

function clampLevel(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(5, Math.trunc(num)));
}

function getInitials(name: string, fallback: string) {
  if (typeof name !== 'string' || !name.trim()) return fallback;
  const parts = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean);
  const letters = parts.join('');
  return letters || fallback;
}

function renderWithMarks(text: string): ReactNode[] {
  if (!text) return [];
  const tokens = text.split(/(\s+)/);
  return tokens.map((token, index) => {
    if (/^\s+$/.test(token)) return token;
    if (/^[A-ZÁÂÃÉÊÍÓÔÕÚÜÇ0-9\/\-]+$/.test(token) && token.length > 1) {
      return (
        <mark key={`mk-${index}`}>
          {token}
        </mark>
      );
    }
    return token;
  });
}

function renderJoinedWithMarks(base: string, additions: string[]): ReactNode[] {
  const nodes: ReactNode[] = [...renderWithMarks(base)];
  additions.forEach((addition) => {
    if (!addition) return;
    nodes.push(' • ');
    nodes.push(...renderWithMarks(addition));
  });
  return nodes;
}

function toNormalizedComment(annotation: AnnotationItem): NormalizedComment {
  const kind = CATEGORY_KIND_MAP[annotation.category] ?? 'argumentacao';
  const meta = COMMENT_KIND_META[kind];
  return {
    id: annotation.id,
    number: annotation.number,
    kind,
    label: meta.label,
    color: meta.color,
    page: annotation.page,
    text: annotation.comment?.trim() ? annotation.comment.trim() : 'Sem comentário registrado.',
  };
}

function extractEnemSelections(score: EssayScorePayload | null): EnemSelections {
  const baseLevels = new Array<number>(5).fill(0);
  const baseReasons = new Array<string[]>(5).fill([]).map(() => []);

  if (!score?.enem) {
    return { levels: baseLevels, reasons: baseReasons };
  }

  const levels = baseLevels.map((_, index) => {
    const fromArray = Array.isArray(score.enem?.levels) ? score.enem.levels[index] : undefined;
    if (Number.isFinite(fromArray)) {
      return clampLevel(fromArray);
    }
    const compKey = `C${index + 1}` as CompetencyKey;
    const comp = score.enem?.competencies?.[compKey];
    if (Number.isFinite(comp?.level)) {
      return clampLevel(comp?.level);
    }
    return 0;
  });

  const reasons = baseReasons.map((_, index) => {
    const compKey = `C${index + 1}` as CompetencyKey;
    const list = score.enem?.competencies?.[compKey]?.reasonIds;
    if (!Array.isArray(list)) return [];
    return list.filter((item): item is string => typeof item === 'string' && item.trim());
  });

  return { levels, reasons };
}

type PasComputation = {
  macros: Array<
    {
      key: PasMacroKey;
      label: string;
      range: string;
      value: number | null;
      raw: number | null;
      outOfRange: boolean;
      decimals: number;
    }
  >;
  nc: number | null;
  errors: Array<{ key: PasErrorKey; label: string; value: number }>;
  ne: number;
  nl: number | null;
  nlValid: boolean;
  nlWarning: boolean;
  nr: number | null;
  formulaText: string;
};

function extractPasComputation(score: EssayScorePayload | null, essay: any | null): PasComputation | null {
  if (!score && !essay) return null;
  const pasScore = score?.pas ?? {};
  const breakdown = (essay as any)?.pasBreakdown ?? {};

  const macroRaw: Record<PasMacroKey, number | null> = {
    apresentacao: parseNumber(pasScore?.apresentacao, breakdown?.apresentacao),
    consistencia: parseNumber(
      pasScore?.argumentacao,
      pasScore?.conteudo,
      breakdown?.argumentacao,
      breakdown?.conteudo,
    ),
    generoTextual: parseNumber(pasScore?.adequacao, pasScore?.genero, breakdown?.adequacao, breakdown?.genero),
    coesaoCoerencia: parseNumber(pasScore?.coesao, breakdown?.coesao),
  } as Record<PasMacroKey, number | null>;

  const errorsRaw: Record<PasErrorKey, number | null> = {
    grafiaAcentuacao: parseNumber(
      pasScore?.erros?.grafia,
      pasScore?.erros?.ortografia,
      breakdown?.erros?.grafia,
      breakdown?.erros?.ortografia,
    ),
    pontuacaoMorfossintaxe: parseNumber(
      pasScore?.erros?.pontuacao,
      pasScore?.erros?.gramatica,
      breakdown?.erros?.pontuacao,
      breakdown?.erros?.gramatica,
    ),
    propriedadeVocabular: parseNumber(
      pasScore?.erros?.propriedade,
      pasScore?.erros?.inadequacao,
      breakdown?.erros?.propriedade,
      breakdown?.erros?.inadequacao,
    ),
  };

  const nlRaw = parseNumber(pasScore?.NL, pasScore?.TL, breakdown?.NL, breakdown?.TL);
  const macros = PAS_MACRO_CONFIG.map((config) => {
    const raw = macroRaw[config.key];
    if (raw == null) {
      return {
        key: config.key,
        label: config.label,
        range: config.range,
        value: null,
        raw: null,
        outOfRange: false,
        decimals: config.decimals,
      };
    }
    const clamped = clamp(raw, config.min, config.max);
    const outOfRange = raw < config.min - 1e-4 || raw > config.max + 1e-4;
    return {
      key: config.key,
      label: config.label,
      range: config.range,
      value: Number(clamped.toFixed(config.decimals)),
      raw,
      outOfRange,
      decimals: config.decimals,
    };
  });

  const ncSum = macros.reduce((acc, item) => acc + (item.value ?? 0), 0);
  const nc = Number(clamp(ncSum, 0, 10).toFixed(2));

  const errors = PAS_ERROR_CONFIG.map((config) => {
    const raw = errorsRaw[config.key];
    const normalized = raw == null ? 0 : Math.max(0, Math.floor(raw));
    return { key: config.key, label: config.label, value: normalized };
  });
  const ne = errors.reduce((acc, item) => acc + item.value, 0);

  const nl =
    nlRaw == null
      ? null
      : Math.max(0, Math.round(nlRaw));
  const nlValid = nl != null && Number.isFinite(nl) && nl > 0;
  const nlWarning = nlValid && nl! < 8;

  let nr: number | null = null;
  let formulaText = '';

  if (score?.annulled) {
    nr = 0;
    formulaText = 'NR = 0,00 — redação anulada';
  } else if (nlValid) {
    const discount = 2 * (ne / nl!);
    const rawNr = nc - discount;
    nr = Number(clamp(rawNr, 0, 10).toFixed(2));
    formulaText = `NR = ${formatNumber(nc, 2)} − 2 × (${formatNumber(ne, 0)} / ${formatNumber(nl, 0)}) = ${formatNumber(nr, 2)}`;
  } else {
    formulaText = 'NR = — (NL inválido para cálculo)';
  }

  return { macros, nc, errors, ne, nl, nlValid, nlWarning, nr, formulaText };
}

function CommentCard({ comment }: { comment: NormalizedComment }) {
  const accent = comment.color;
  const background = hexToRgba(accent, 0.32);
  const border = hexToRgba(accent, 0.55);
  const headerColor = accent;

  return (
    <article
      className="comment-card"
      style={{ backgroundColor: background, borderColor: border }}
    >
      <div className="comment-card__header" style={{ backgroundColor: headerColor, color: '#0f172a' }}>
        {comment.label}
        <span>#{comment.number}</span>
      </div>
      <div className="comment-card__body">
        <div className="comment-card__meta">Página {comment.page}</div>
        <div>{comment.text}</div>
      </div>
    </article>
  );
}

function CompetencyCard({
  index,
  level,
  reasons,
}: {
  index: number;
  level: number;
  reasons: string[];
}) {
  const key = `C${index + 1}` as CompetencyKey;
  const title = COMPETENCY_TITLES[key];
  const baseTexts = COMPETENCY_BASE_TEXTS[key];
  const normalizedLevel = clampLevel(level);
  const baseText = baseTexts[normalizedLevel] ?? baseTexts[0];
  const reasonsWithLabels = reasons
    .map((reason) => ENEM_REASON_LABELS[reason] ?? reason)
    .filter(Boolean);
  const points = POINTS_PER_LEVEL[normalizedLevel] ?? 0;

  return (
    <article className="competency-card">
      <div className="competency-card__headline">
        <h3>COMPETÊNCIA {index + 1}</h3>
        <div className="competency-card__subtitle">{title}</div>
      </div>
      <div className="competency-card__status">
        <span className="level-pill">Nível {normalizedLevel}</span>
        <span className="points-pill">{points} pts</span>
      </div>
      <div className="competency-card__body">
        <p>
          {renderJoinedWithMarks(baseText, reasonsWithLabels).map((node, nodeIndex) => (
            <Fragment key={`comp-${index}-node-${nodeIndex}`}>{node}</Fragment>
          ))}
        </p>
      </div>
    </article>
  );
}

export default function EssayPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [essay, setEssay] = useState<any | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [score, setScore] = useState<EssayScorePayload | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const essayData = await fetchEssayById(id, { signal: controller.signal });
        if (!active) return;
        setEssay(essayData);

        try {
          const token = await issueFileToken(id, { signal: controller.signal });
          if (!active) return;
          const meta = await peekEssayFile(id, { token, signal: controller.signal });
          if (!active) return;
          setPdfUrl(meta.url);
        } catch (fileErr) {
          console.warn('[EssayPrintPage] Failed to get tokenized PDF URL', fileErr);
          if (active) {
            setPdfUrl(essayData?.originalUrl || essayData?.fileUrl || null);
          }
        }

        const [annotationPayload, scorePayload] = await Promise.all([
          getEssayAnnotations(id).catch(() => []),
          getEssayScore(id).catch(() => null),
        ]);
        if (!active) return;

        setAnnotations(renumber(normalizeAnnotations(annotationPayload)));
        setScore(scorePayload);
      } catch (err: any) {
        if (!active) return;
        console.error('[EssayPrintPage] Failed to load essay data', err);
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Não foi possível carregar os dados da redação.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  const orderedAnnotations = useMemo(
    () => renumber(annotations).sort((a, b) => a.number - b.number),
    [annotations],
  );

  const comments = useMemo(
    () => orderedAnnotations.map((annotation) => toNormalizedComment(annotation)),
    [orderedAnnotations],
  );

  const page1Comments = comments.slice(0, MAX_COMMENTS_PAGE1);
  const page2Comments = comments.slice(MAX_COMMENTS_PAGE1);

  const studentName = useMemo(() => {
    if (!essay) return 'Aluno';
    return essay.student?.name || essay.studentName || 'Aluno';
  }, [essay]);

  const studentPhoto = useMemo(() => {
    if (!essay) return null;
    const potentialSources = [
      (essay.student as any)?.photo,
      (essay.student as any)?.photoUrl,
      (essay.studentId as any)?.photo,
      (essay.studentId as any)?.photoUrl,
    ];
    const source = potentialSources.find((value): value is string => typeof value === 'string' && value.trim());
    if (!source) return null;
    const cleaned = source.trim();
    if (cleaned.startsWith('http') || cleaned.startsWith('data:')) return cleaned;
    const base64Like = /^[A-Za-z0-9+/=\s]+$/.test(cleaned);
    if (base64Like) {
      return `data:image/jpeg;base64,${cleaned.replace(/\s+/g, '')}`;
    }
    return cleaned;
  }, [essay]);

  const studentInitials = useMemo(
    () => getInitials(studentName, 'A'),
    [studentName],
  );

  const teacherName = useMemo(() => {
    const raw =
      (essay as any)?.teacher?.name ||
      (essay as any)?.teacherId?.name ||
      (essay as any)?.teacherName ||
      'Professor Yago Sales';
    return raw;
  }, [essay]);

  const teacherInitials = useMemo(
    () =>
      (essay as any)?.teacher?.initials ||
      (essay as any)?.teacherInitials ||
      getInitials(teacherName, 'YS'),
    [essay, teacherName],
  );

  const callNumber = useMemo(() => {
    const raw =
      (essay as any)?.studentId?.rollNumber ??
      (essay as any)?.student?.rollNumber ??
      (essay as any)?.student?.callNumber ??
      (essay as any)?.student?.numeroChamada ??
      null;
    if (raw == null || raw === '') return '—';
    return String(raw);
  }, [essay]);

  const classLabel = useMemo(() => {
    if (!essay) return '—';
    return essay.student?.className || essay.class?.name || essay.className || '—';
  }, [essay]);

  const bimestreLabel = useMemo(() => {
    if (!essay) return '—';
    const raw =
      essay.term ??
      essay.bimester ??
      essay.bimestre ??
      essay.bimesterNumber ??
      null;
    if (raw == null || raw === '') return '—';
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      return `${numeric}º bimestre`;
    }
    return String(raw);
  }, [essay]);

  const submittedAt = useMemo(() => {
    if (!essay) return '—';
    return formatDate(essay.submittedAt ?? essay.sentAt ?? essay.createdAt);
  }, [essay]);

  const modelCode = useMemo(() => {
    const candidates = [
      (essay as any)?.modelTheme?.model,
      essay?.type,
      essay?.model,
    ];
    const normalized = candidates
      .map((value) => (typeof value === 'string' ? value.toUpperCase().trim() : ''))
      .filter(Boolean);
    if (normalized.includes('ENEM')) return 'ENEM';
    if (normalized.includes('PAS_UNB')) return 'PAS_UNB';
    if (normalized.includes('PAS')) return 'PAS';
    return normalized[0] || 'PAS_UNB';
  }, [essay]);

  const isEnem = modelCode === 'ENEM';
  const isPas = modelCode === 'PAS_UNB' || modelCode === 'PAS';

  const modelLabel = useMemo(() => (isEnem ? 'ENEM' : 'PAS/UnB'), [isEnem]);

  const themeLabel = useMemo(() => {
    if (!essay) return 'Tema não informado';
    return essay.theme || essay.topic || 'Tema não informado';
  }, [essay]);

  const fallbackScore = useMemo(() => {
    if (!essay?.grade) return null;
    if (Number.isFinite(essay.grade.nb)) return essay.grade.nb;
    if (Number.isFinite(essay.grade.scaledScore)) return essay.grade.scaledScore;
    return null;
  }, [essay?.grade]);

  const enemSelections = useMemo(
    () => (isEnem ? extractEnemSelections(score) : { levels: [], reasons: [] }),
    [isEnem, score],
  );

  const pasData = useMemo(
    () => (isPas ? extractPasComputation(score, essay) : null),
    [isPas, score, essay],
  );

  const totalEnemPoints = useMemo(() => {
    if (!isEnem || score?.annulled) return 0;
    const levels = enemSelections.levels.length === 5 ? enemSelections.levels : new Array(5).fill(0);
    return levels.reduce((sum, level) => sum + (POINTS_PER_LEVEL[clampLevel(level)] ?? 0), 0);
  }, [enemSelections.levels, isEnem, score?.annulled]);

  const headerScoreLabel = useMemo(() => {
    if (score?.annulled) return 'ANULADA';
    if (isEnem) {
      return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(totalEnemPoints);
    }
    return formattedScore;
  }, [formattedScore, isEnem, score?.annulled, totalEnemPoints]);

  const finalBannerContent = useMemo(() => {
    if (!isEnem) return null;
    if (score?.annulled) return 'Redação anulada';
    return `${totalEnemPoints} / 1000`;
  }, [isEnem, score?.annulled, totalEnemPoints]);

  if (loading && !essay) {
    return (
      <div className="print-wrapper">
        <article className="print-page">
          <div className="loading-state">Carregando exportação…</div>
        </article>
      </div>
    );
  }

  if (error) {
    return (
      <div className="print-wrapper">
        <article className="print-page">
          <div className="error-state">{error}</div>
        </article>
      </div>
    );
  }

  const competencyLevels =
    enemSelections.levels.length === 5 ? enemSelections.levels : new Array<number>(5).fill(0);
  const competencyReasons =
    enemSelections.reasons.length === 5 ? enemSelections.reasons : new Array<string[]>(5).fill([]).map(() => []);

  return (
    <div className="print-wrapper">
      <article className="print-page print-page--summary">
        <header className="summary-header">
          <div className="summary-teacher">
            <div className="summary-teacher-avatar">{teacherInitials}</div>
            <div className="summary-teacher-info">
              <strong>{teacherName}</strong>
              <span>Colegio Yago Sales • Plataforma de Correção</span>
            </div>
          </div>
          <div className="summary-badge">
            NOTA:
            <span>{headerScoreLabel}</span>
          </div>
        </header>

        <section className="student-strip">
          <div className="student-photo">
            {studentPhoto ? <img src={studentPhoto} alt={studentName} /> : studentInitials}
          </div>
          <div className="student-info">
            <h1>{studentName.toUpperCase()}</h1>
            <div className="student-meta">
              <span data-label="Nº chamada:">{callNumber}</span>
              <span data-label="Turma:">{classLabel}</span>
              <span data-label="Bimestre:">{bimestreLabel}</span>
              <span data-label="Entrega:">{submittedAt}</span>
            </div>
            <div className="student-model-theme">
              <strong>Modelo:</strong> {modelLabel} &nbsp;•&nbsp; <strong>Tema:</strong> {themeLabel}
            </div>
          </div>
        </section>

        <section className="summary-grid">
          <div className="essay-pane">
            {pdfUrl ? (
              <PdfPrintPreview
                fileUrl={pdfUrl}
                annotations={orderedAnnotations}
                categoryColors={Object.fromEntries(
                  (Object.keys(HIGHLIGHT_CATEGORIES) as HighlightCategoryKey[]).map((key) => [
                    key,
                    HIGHLIGHT_CATEGORIES[key].color,
                  ]),
                )}
                overlayAlpha={0.26}
                maxPages={1}
              />
            ) : (
              <div className="pdf-placeholder">Redação não disponível.</div>
            )}
          </div>
          <aside className="comments-pane">
            <h2>COMENTÁRIOS</h2>
            <div className="comment-list">
              {page1Comments.length === 0 ? (
                <p className="no-comments">Nenhum comentário registrado.</p>
              ) : (
                page1Comments.map((comment) => <CommentCard key={comment.id} comment={comment} />)
              )}
            </div>
          </aside>
        </section>
      </article>

      {isEnem && (
        <article className="print-page print-page--mirror">
          <div className="mirror-header">
            <div className="mirror-avatar">{teacherInitials}</div>
            <div className="mirror-title">
              <h2>ESPELHO DE CORREÇÃO</h2>
              <span>Resumo das competências avaliadas e justificativas selecionadas</span>
            </div>
          </div>
          <section className="mirror-grid">
            <div className="competency-stack">
              {competencyLevels.map((level, index) => (
                <CompetencyCard
                  key={`competency-${index}`}
                  index={index}
                  level={level}
                  reasons={competencyReasons[index] ?? []}
                />
              ))}
              {finalBannerContent && (
                <div className="final-score-banner">
                  NOTA FINAL DA REDAÇÃO
                  <strong>{finalBannerContent}</strong>
                </div>
              )}
            </div>
            <aside className="mirror-comments">
              <h2>COMENTÁRIOS (continuação)</h2>
              <div className="comment-list">
                {page2Comments.length === 0 ? (
                  <p className="no-comments">Nenhum comentário adicional.</p>
                ) : (
                  page2Comments.map((comment) => <CommentCard key={comment.id} comment={comment} />)
                )}
              </div>
            </aside>
          </section>
        </article>
      )}
    </div>
  );
}
