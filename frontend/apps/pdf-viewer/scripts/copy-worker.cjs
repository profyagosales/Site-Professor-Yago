const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const nm = (...p) => require.resolve(path.join('pdfjs-dist', ...p));
fs.mkdirSync(path.join(root, 'public'), { recursive: true });

try {
	const esm = nm('build/pdf.worker.min.mjs');
	fs.copyFileSync(esm, path.join(root, 'public', 'pdf.worker.min.mjs'));
	console.error('[viewer] Copiado ESM worker');
} catch {}
try {
	const umd = nm('legacy/build/pdf.worker.min.js');
	fs.copyFileSync(umd, path.join(root, 'public', 'pdf.worker.min.js'));
	console.error('[viewer] Copiado UMD worker');
} catch {}
