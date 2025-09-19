import fs from 'fs';

// Atenção: mais permissivo, mas ainda tenta ser seguro.
// Ele substitui estruturas curtas do tipo <Link ...>...Abrir...</Link> por um span de "Visualização inline"
// quando o conteúdo interno contém apenas texto/ícone simples (sem {expressões} complexas).

const listFile = 'tmp/abrir_candidates_wide.txt';
if (!fs.existsSync(listFile)) process.exit(0);

const lines = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
const files = new Set(lines.map(l => l.split(':')[0]).filter(f => /\.(tsx|jsx)$/.test(f)));

let touched = 0;
for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');

  // Heurística: pega tags Link|a|Button com conteúdo interno curto contendo "Abrir"
  const before = s;
  s = s.replace(
    /<(Link|a|Button)([^>]*)>([^<]{0,60}?Abrir[^<]{0,60}?)<\/\1>/g,
    '<span className="text-muted-foreground/70 select-none" title="Visualização inline">Visualização inline</span>'
  );

  if (s !== before) {
    fs.writeFileSync(file, s, 'utf8');
    touched++;
    console.log('Atualizado (wide):', file);
  }
}

console.log(`Arquivos modificados (wide): ${touched}`);
