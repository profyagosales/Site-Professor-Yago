import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E tests setup...');
  
  // Run seed for development data
  try {
    console.log('🌱 Seeding development data...');
    execSync('npm run seed:dev', { 
      cwd: process.cwd(),
      stdio: 'inherit',
      timeout: 30000 // 30 seconds timeout
    });
    console.log('✅ Development data seeded');
  } catch (error) {
    console.warn('⚠️ Seed failed, continuing with tests:', error);
  }
  
  // The webServer in playwright.config.ts will handle starting the dev server
  console.log('✅ E2E setup completed - dev server will be started by Playwright');
  
  console.log('✅ E2E setup completed');
}

export default globalSetup;


