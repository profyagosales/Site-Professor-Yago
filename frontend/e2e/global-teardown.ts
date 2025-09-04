import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E tests...');
  console.log('✅ E2E teardown completed');
}

export default globalTeardown;
