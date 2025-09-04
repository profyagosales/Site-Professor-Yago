import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E tests setup...');
  
  // Start browser to test if everything is working
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the dev server to be ready
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    console.log('✅ Dev server is ready');
  } catch (error) {
    console.error('❌ Dev server not ready:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ E2E setup completed');
}

export default globalSetup;
