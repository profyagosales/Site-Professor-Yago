import fs from 'fs';
import path from 'path';

// Lê a lista gerada pelo grep (formato: path:lineno:contexto)
const listFile = 'tmp/abrir_candidates.txt';
if (!fs.existsSync(listFile)) {
  console.log('Nenhum candidato encontrado (arquivo tmp/abrir_candidates.txt não existe). Nada a fazer.');
  process.exit(0);
}

const lines = fs.readFileSync(listFile, 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean);

// Coletar arquivos .tsx/.jsx/.ts/.js únicos
const files = new Set();
for (const line of lines) {
  const file = line.split(':')[0];
  if (/\.(tsx|jsx|ts|js)$/.test(file)) files.add(file);
}

if (!files.size) {
  console.log('Sem arquivos elegíveis para modificação.');
  process.exit(0);
}

// Regex seguro: tag <Link|a|Button> com texto direto "Abrir" (sem filhos adicionais)
const re = /<(Link|a|Button)([^>]*)>\s*Abrir\s*<\/\1>/g;

// Substituição por um span sem quebrar layout
const replacement = '<span className="text-muted-foreground/70 select-none" title="Visualização inline">Visualização inline</span>';

let touched = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!re.test(src)) continue; // nada a trocar nesse arquivo
  const out = src.replace(re, replacement);
  if (out !== src) {
    fs.writeFileSync(file, out, 'utf8');
    touched++;
    console.log('Atualizado:', file);
  }
}

console.log(`Arquivos modificados: ${touched}`);
