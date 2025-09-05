#!/usr/bin/env node

/**
 * Script de validação de rotas
 * Verifica invariantes importantes para evitar quebras
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Valida se arquivo de rotas existe e é válido
 */
function validateRoutesFile() {
  const routesPath = path.join(__dirname, '../src/routes.ts');
  
  if (!fs.existsSync(routesPath)) {
    logError('Arquivo src/routes.ts não encontrado');
    return false;
  }

  try {
    const content = fs.readFileSync(routesPath, 'utf8');
    
    // Verifica se tem ROUTES exportado
    if (!content.includes('export const ROUTES')) {
      logError('Arquivo routes.ts não exporta ROUTES');
      return false;
    }

    // Verifica se tem assertRoute
    if (!content.includes('assertRoute')) {
      logError('Arquivo routes.ts não usa assertRoute para validação');
      return false;
    }

    logSuccess('Arquivo routes.ts encontrado e válido');
    return true;
  } catch (error) {
    logError(`Erro ao ler routes.ts: ${error.message}`);
    return false;
  }
}

/**
 * Valida se validador de rotas existe
 */
function validateRoutesValidator() {
  const validatorPath = path.join(__dirname, '../src/routes/validateRoutes.ts');
  
  if (!fs.existsSync(validatorPath)) {
    logError('Arquivo src/routes/validateRoutes.ts não encontrado');
    return false;
  }

  try {
    const content = fs.readFileSync(validatorPath, 'utf8');
    
    // Verifica se tem funções de validação
    if (!content.includes('validateRoutes') || !content.includes('validateAndReportRoutes')) {
      logError('Arquivo validateRoutes.ts não tem funções de validação');
      return false;
    }

    logSuccess('Validador de rotas encontrado');
    return true;
  } catch (error) {
    logError(`Erro ao ler validateRoutes.ts: ${error.message}`);
    return false;
  }
}

/**
 * Valida se App.tsx usa ROUTES corretamente
 */
function validateAppRoutes() {
  const appPath = path.join(__dirname, '../src/App.tsx');
  
  if (!fs.existsSync(appPath)) {
    logError('Arquivo src/App.tsx não encontrado');
    return false;
  }

  try {
    const content = fs.readFileSync(appPath, 'utf8');
    
    // Verifica se importa ROUTES
    if (!content.includes("import { ROUTES }")) {
      logError('App.tsx não importa ROUTES');
      return false;
    }

    // Verifica se usa ROUTES em vez de strings hardcoded
    const hardcodedPaths = content.match(/path=["']\/[^"']*["']/g);
    if (hardcodedPaths && hardcodedPaths.length > 0) {
      logWarning('App.tsx pode ter paths hardcoded em vez de usar ROUTES');
      hardcodedPaths.forEach(path => {
        logWarning(`  Encontrado: ${path}`);
      });
    }

    logSuccess('App.tsx usa ROUTES corretamente');
    return true;
  } catch (error) {
    logError(`Erro ao ler App.tsx: ${error.message}`);
    return false;
  }
}

/**
 * Valida se não há paths absolutos em rotas aninhadas
 */
function validateNestedPaths() {
  const appPath = path.join(__dirname, '../src/App.tsx');
  
  try {
    const content = fs.readFileSync(appPath, 'utf8');
    
    // Procura por rotas aninhadas com paths absolutos
    const nestedRoutePattern = /<Route\s+path={ROUTES\.\w+\.\w+}.*?>(.*?)<\/Route>/gs;
    const matches = content.match(nestedRoutePattern);
    
    if (matches) {
      matches.forEach(match => {
        if (match.includes('path="/')) {
          logError('Encontrada rota aninhada com path absoluto');
          logError(`  ${match.substring(0, 100)}...`);
          return false;
        }
      });
    }

    logSuccess('Rotas aninhadas usam paths relativos');
    return true;
  } catch (error) {
    logError(`Erro ao validar paths aninhados: ${error.message}`);
    return false;
  }
}

/**
 * Valida se PDF viewer tem worker path correto
 */
function validatePdfViewer() {
  const viewerPath = path.join(__dirname, '../apps/pdf-viewer/src/Viewer.tsx');
  
  if (!fs.existsSync(viewerPath)) {
    logError('Arquivo apps/pdf-viewer/src/Viewer.tsx não encontrado');
    return false;
  }

  try {
    const content = fs.readFileSync(viewerPath, 'utf8');
    
    // Verifica se usa worker path correto
    if (!content.includes('/viewer/pdf.worker.mjs')) {
      logError('PDF viewer não usa worker path correto');
      return false;
    }

    logSuccess('PDF viewer configurado corretamente');
    return true;
  } catch (error) {
    logError(`Erro ao validar PDF viewer: ${error.message}`);
    return false;
  }
}

/**
 * Valida se não há imports estáticos de PDF
 */
function validatePdfImports() {
  const srcDir = path.join(__dirname, '../src');
  
  try {
    const files = fs.readdirSync(srcDir, { recursive: true });
    const problematicFiles = [];
    
    files.forEach(file => {
      if (typeof file === 'string' && file.endsWith('.tsx') || file.endsWith('.ts')) {
        const filePath = path.join(srcDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Verifica imports problemáticos (exceto arquivos permitidos)
        const allowedFiles = ['PdfHighlighter.tsx', 'pdfSetup.ts'];
        const fileName = path.basename(file);
        if (!allowedFiles.includes(fileName) && 
            (content.includes('react-pdf') || content.includes('pdfjs-dist') || content.includes('react-pdf-highlighter'))) {
          problematicFiles.push(file);
        }
      }
    });
    
    if (problematicFiles.length > 0) {
      logError('Encontrados imports estáticos de PDF:');
      problematicFiles.forEach(file => {
        logError(`  ${file}`);
      });
      return false;
    }

    logSuccess('Nenhum import estático de PDF encontrado');
    return true;
  } catch (error) {
    logError(`Erro ao validar imports PDF: ${error.message}`);
    return false;
  }
}

/**
 * Função principal
 */
function main() {
  log('🔍 Iniciando validação de rotas...', 'bold');
  
  const validations = [
    { name: 'Arquivo de rotas', fn: validateRoutesFile },
    { name: 'Validador de rotas', fn: validateRoutesValidator },
    { name: 'App.tsx usa ROUTES', fn: validateAppRoutes },
    { name: 'Paths aninhados relativos', fn: validateNestedPaths },
    { name: 'PDF viewer configurado', fn: validatePdfViewer },
    { name: 'Imports PDF dinâmicos', fn: validatePdfImports }
  ];
  
  let allValid = true;
  
  validations.forEach(({ name, fn }) => {
    logInfo(`Validando ${name}...`);
    if (!fn()) {
      allValid = false;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  
  if (allValid) {
    logSuccess('Todas as validações passaram!');
    process.exit(0);
  } else {
    logError('Algumas validações falharam!');
    process.exit(1);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };
