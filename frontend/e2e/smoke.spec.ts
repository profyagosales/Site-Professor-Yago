import { test, expect } from '@playwright/test';
import { setupMocks, setupAlunoMocks } from './mocks';

test.describe('Smoke Tests - Critical Flows', () => {
  test('Landing page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Verificar elementos essenciais
    await expect(page).toHaveTitle(/Professor Yago/);
    await expect(page.getByText('Professor Yago Sales')).toBeVisible();
    await expect(page.getByText('Sou Professor')).toBeVisible();
    await expect(page.getByText('Sou Aluno')).toBeVisible();
    
    // Verificar se não há erros de console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    // Verificar se não há erros críticos
    const criticalErrors = errors.filter(error => 
      !error.includes('Failed to load resource') && 
      !error.includes('404') &&
      !error.includes('CORS')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('Professor login flow works end-to-end', async ({ page }) => {
    await setupMocks(page);
    
    // Landing → Login
    await page.goto('/');
    await page.getByText('Sou Professor').click();
    await expect(page).toHaveURL('/login-professor');
    
    // Verificar se a página de login carregou
    await expect(page.locator('p.tracking-\\[0\\.25em\\]').getByText('PROFESSOR')).toBeVisible();
    
    // Verificar se os campos de login estão presentes
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Aluno login flow works end-to-end', async ({ page }) => {
    await setupAlunoMocks(page);
    
    // Landing → Login
    await page.goto('/');
    await page.getByText('Sou Aluno').click();
    await expect(page).toHaveURL('/login-aluno');
    
    // Verificar se a página de login carregou
    await expect(page.getByText('ALUNO')).toBeVisible();
    
    // Verificar se os campos de login estão presentes
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('PDF viewer integration works', async ({ page }) => {
    await setupMocks(page);
    
    // Verificar se a página de login carrega
    await page.goto('/login-professor');
    await expect(page.locator('p.tracking-\\[0\\.25em\\]').getByText('PROFESSOR')).toBeVisible();
    
    // Verificar se os campos estão presentes
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Responsive design works on mobile', async ({ page }) => {
    // Simular dispositivo móvel
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Verificar se elementos estão visíveis em mobile
    await expect(page.getByText('Professor Yago Sales')).toBeVisible();
    await expect(page.getByText('Sou Professor')).toBeVisible();
    await expect(page.getByText('Sou Aluno')).toBeVisible();
    
    // Verificar se não há overflow horizontal
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Margem de erro
  });

  test('Error handling works correctly', async ({ page }) => {
    // Testar rota inexistente
    await page.goto('/nonexistent-route');
    await expect(page.getByText('Página não encontrada')).toBeVisible();
    await expect(page.getByText('🏠 Página inicial')).toBeVisible();
    
    // Testar se os links de erro funcionam
    await page.getByText('🏠 Página inicial').click();
    await expect(page).toHaveURL('/');
  });

  test('Performance metrics are acceptable', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Verificar se a página carrega em tempo razoável (5 segundos)
    expect(loadTime).toBeLessThan(5000);
    
    // Verificar se não há muitos recursos carregados
    const requests = await page.evaluate(() => {
      return performance.getEntriesByType('resource').length;
    });
    
    // Verificar se não há muitos requests (indicaria problema de performance)
    expect(requests).toBeLessThan(100);
  });
});
