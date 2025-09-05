import { test, expect } from '@playwright/test';
import { setupMocks, setupAlunoMocks } from './mocks';
import { 
  loginAsTeacher, 
  loginAsStudent, 
  logout, 
  verifyPdfViewer, 
  verifyPageLoaded,
  expectTestIdVisible,
  clickByTestId,
  verifyNoJSErrors
} from './helpers';

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

  test('Professor complete flow: landing → login → resumo → redação → PDF → logout', async ({ page }) => {
    await setupMocks(page);
    
    // 1. Landing → Login Professor
    await page.goto('/');
    await page.getByText('Sou Professor').click();
    await expect(page).toHaveURL('/login-professor');
    
    // Verificar se a página de login carregou
    await expectTestIdVisible(page, 'login-form');
    await expectTestIdVisible(page, 'email-input');
    await expectTestIdVisible(page, 'password-input');
    await expectTestIdVisible(page, 'submit-button');
    
    // 2. Login como professor
    await loginAsTeacher(page);
    
    // 3. Verificar dashboard do professor
    await expectTestIdVisible(page, 'professor-dashboard');
    await expectTestIdVisible(page, 'profile-header');
    await expectTestIdVisible(page, 'summary-cards');
    await expectTestIdVisible(page, 'pending-essays-card');
    
    // 4. Navegar para redações
    await clickByTestId(page, 'view-essays-button');
    await expect(page).toHaveURL('/professor/redacao');
    
    // 5. Verificar se há redações para visualizar
    await expectTestIdVisible(page, 'essays-list');
    
    // 6. Tentar abrir uma redação (se houver)
    const essayItem = page.locator('[data-testid="essay-item"]').first();
    if (await essayItem.isVisible()) {
      await essayItem.click();
      
      // 7. Verificar se PDF viewer está funcionando
      await verifyPdfViewer(page);
    }
    
    // 8. Logout
    await logout(page);
    await expect(page).toHaveURL('/');
  });

  test('Aluno complete flow: landing → login → dashboard → recados/notas → logout', async ({ page }) => {
    await setupAlunoMocks(page);
    
    // 1. Landing → Login Aluno
    await page.goto('/');
    await page.getByText('Sou Aluno').click();
    await expect(page).toHaveURL('/login-aluno');
    
    // Verificar se a página de login carregou
    await expectTestIdVisible(page, 'login-form');
    await expectTestIdVisible(page, 'email-input');
    await expectTestIdVisible(page, 'password-input');
    await expectTestIdVisible(page, 'submit-button');
    
    // 2. Login como aluno
    await loginAsStudent(page);
    
    // 3. Verificar dashboard do aluno
    await expectTestIdVisible(page, 'student-dashboard');
    await expectTestIdVisible(page, 'student-profile');
    
    // 4. Verificar se há recados ou notas
    const announcements = page.locator('[data-testid="announcements"]');
    const grades = page.locator('[data-testid="grades"]');
    
    if (await announcements.isVisible()) {
      await expectTestIdVisible(page, 'announcements');
    }
    
    if (await grades.isVisible()) {
      await expectTestIdVisible(page, 'grades');
    }
    
    // 5. Logout
    await logout(page);
    await expect(page).toHaveURL('/');
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

  test('Performance and error handling', async ({ page }) => {
    // Verificar performance da landing page
    await page.goto('/');
    await verifyPageLoaded(page);
    await verifyNoJSErrors(page);
    
    // Verificar responsividade
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText('Professor Yago Sales')).toBeVisible();
    await expect(page.getByText('Sou Professor')).toBeVisible();
    await expect(page.getByText('Sou Aluno')).toBeVisible();
  });
});
