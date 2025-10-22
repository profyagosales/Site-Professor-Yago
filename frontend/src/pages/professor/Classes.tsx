import React from 'react';
import { getClassColor, isColorLight } from '@/features/schedule/colors';

type ClassCard = {
  id: string;
  name: string;
  subject?: string;
  series?: string;
  studentsCount?: number;
  teachersCount?: number;
};

// Página de Turmas (professor) simples baseada em props; integre com seu fetch atual
const ClassesPage: React.FC<{ classes: ClassCard[] }> = ({ classes = [] }) => {
  return (
    <main className="max-w-[1200px] mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Turmas</h1>
        <p className="text-sm text-gray-500">Gerencie turmas, alunos e avaliações.</p>
      </header>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => {
          const bg = getClassColor(c.id || c.name);
          const lightText = !isColorLight(bg); // true => fundo escuro -> texto branco
          return (
            <article
              key={c.id}
              aria-label={`Turma ${c.name} — ${c.series ?? ''} — ${c.studentsCount ?? 0} alunos`}
              className="rounded-lg shadow-sm p-4 min-h-[140px] transition-transform transform hover:-translate-y-1 hover:shadow-md"
              style={{ backgroundColor: bg, color: lightText ? '#ffffff' : '#111827' }}
            >
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-semibold leading-tight">{c.name}</h2>
                  <div className="text-sm opacity-80">{c.series}</div>
                </div>

                <p className="text-sm mt-2 opacity-90">{c.subject}</p>

                <div className="mt-auto flex gap-4 text-sm items-center">
                  <span>{`Alunos: ${c.studentsCount ?? 0}`}</span>
                  <span>{`Professores: ${c.teachersCount ?? 0}`}</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
};

export default ClassesPage;

