import type { Essay, EssayStatus, EssaysPage } from '@/types/redacao';

const names = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Elisa',
  'Fabio',
  'Gi',
  'Henrique',
  'Isa',
  'João',
];
const classes = ['1A', '1B', '2A', '2B', '3A'];

const all: Essay[] = Array.from({ length: 12 })
  .map((_, i) => ({
    id: String(i + 1),
    studentName: names[i % names.length],
    className: classes[i % classes.length],
    topic: i % 2 ? 'Tema: Mobilidade Urbana' : 'Tema: Inclusão Digital',
    submittedAt: new Date(Date.now() - i * 86400000).toISOString(),
    fileUrl: 'https://example.com/file.pdf',
    ...(i % 3 === 0 ? { score: 800, comments: 'Muito boa' } : {}),
  }))
  .map((e, i) => ({ ...e, ...(i % 3 === 0 ? {} : {}) }));

export function getMockPage(params: {
  status: EssayStatus;
  page: number;
  pageSize: number;
  q?: string;
  classId?: string;
}) {
  const { status, page, pageSize, q, classId } = params;
  const corrected = all.filter(e => typeof e.score === 'number');
  const pending = all.filter(e => typeof e.score !== 'number');
  let items = status === 'corrected' ? corrected : pending;
  if (q)
    items = items.filter(e =>
      e.studentName.toLowerCase().includes(q.toLowerCase())
    );
  if (classId) items = items.filter(e => e.className === classId);
  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  return { items: paged, page, pageSize, total } as EssaysPage;
}

export default { getMockPage };
