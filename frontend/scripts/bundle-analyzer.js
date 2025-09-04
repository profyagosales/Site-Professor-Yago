import { gzipSync } from 'zlib';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Plugin para análise de bundle e validação de budgets
 */
export function bundleAnalyzer() {
  return {
    name: 'bundle-analyzer',
    writeBundle(options, bundle) {
      const outDir = options.dir || 'dist';
      const budgets = {
        vendor: { max: 300 * 1024, name: 'vendor' }, // 300KB gzip
        index: { max: 180 * 1024, name: 'index' },   // 180KB gzip
        pdf: { max: 500 * 1024, name: 'pdf' },       // 500KB gzip (PDF é pesado)
        total: { max: 1000 * 1024, name: 'total' }   // 1MB gzip total
      };

      const results = [];
      let totalSize = 0;

      console.log('\n📊 Bundle Analysis:');
      console.log('='.repeat(50));

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          const filePath = join(outDir, fileName);
          
          if (existsSync(filePath)) {
            const content = readFileSync(filePath);
            const gzipped = gzipSync(content);
            const size = gzipped.length;
            const sizeKB = (size / 1024).toFixed(1);
            
            totalSize += size;
            
            // Determinar tipo de chunk
            let chunkType = 'other';
            if (fileName.includes('vendor')) chunkType = 'vendor';
            else if (fileName.includes('index')) chunkType = 'index';
            else if (fileName.includes('pdf')) chunkType = 'pdf';
            
            const budget = budgets[chunkType];
            const status = budget && size > budget.max ? '❌' : '✅';
            
            console.log(`${status} ${fileName.padEnd(30)} ${sizeKB.padStart(8)} KB (${chunkType})`);
            
            if (budget && size > budget.max) {
              results.push({
                file: fileName,
                type: chunkType,
                size,
                max: budget.max,
                exceeded: size - budget.max
              });
            }
          }
        }
      }

      // Verificar total
      const totalSizeKB = (totalSize / 1024).toFixed(1);
      const totalStatus = totalSize > budgets.total.max ? '❌' : '✅';
      console.log(`${totalStatus} Total Bundle Size: ${totalSizeKB.padStart(8)} KB`);
      
      console.log('='.repeat(50));

      // Falhar se exceder budgets
      if (results.length > 0) {
        console.log('\n❌ Bundle size exceeded budgets:');
        results.forEach(result => {
          const exceededKB = (result.exceeded / 1024).toFixed(1);
          console.log(`  • ${result.file}: ${(result.size / 1024).toFixed(1)}KB > ${(result.max / 1024).toFixed(1)}KB (+${exceededKB}KB)`);
        });
        
        console.log('\n💡 Optimization suggestions:');
        console.log('  • Use dynamic imports for heavy libraries');
        console.log('  • Split vendor chunks by feature');
        console.log('  • Remove unused dependencies');
        console.log('  • Optimize images and assets');
        
        process.exit(1);
      } else {
        console.log('✅ All bundle sizes within budgets!');
      }
    }
  };
}
