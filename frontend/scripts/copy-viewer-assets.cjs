const fs = require('fs');
const path = require('path');

// Script para copiar assets do PDF viewer para o build principal
const viewerDistDir = path.join(__dirname, '..', 'apps', 'pdf-viewer', 'dist');
const mainDistDir = path.join(__dirname, '..', 'dist');
const viewerTargetDir = path.join(mainDistDir, 'viewer');

console.log('📁 Copiando assets do PDF viewer...');

// Verificar se o diretório do viewer existe
if (!fs.existsSync(viewerDistDir)) {
  console.error('❌ Diretório do viewer não encontrado:', viewerDistDir);
  process.exit(1);
}

// Criar diretório de destino se não existir
if (!fs.existsSync(viewerTargetDir)) {
  fs.mkdirSync(viewerTargetDir, { recursive: true });
  console.log('📁 Criado diretório:', viewerTargetDir);
}

// Função para copiar recursivamente
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
    console.log('📄 Copiado:', path.relative(mainDistDir, dest));
  }
}

try {
  // Copiar todo o conteúdo do dist do viewer para dist/viewer/
  copyRecursive(viewerDistDir, viewerTargetDir);
  
  // Verificar se o pdf.worker.mjs foi copiado
  const workerPath = path.join(viewerTargetDir, 'pdf.worker.mjs');
  if (fs.existsSync(workerPath)) {
    console.log('✅ pdf.worker.mjs copiado com sucesso');
  } else {
    console.warn('⚠️  pdf.worker.mjs não encontrado no build do viewer');
  }
  
  console.log('✅ Assets do PDF viewer copiados com sucesso para /viewer/');
} catch (error) {
  console.error('❌ Erro ao copiar assets do viewer:', error.message);
  process.exit(1);
}
