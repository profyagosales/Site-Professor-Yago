/**
 * Helpers para testes E2E
 * 
 * Funcionalidades:
 * - Login de professor e aluno
 * - Navegação entre páginas
 * - Verificação de elementos
 * - Utilitários de teste
 */

import { Page, expect } from '@playwright/test';
import { mockData } from './mocks';

export interface LoginOptions {
  waitForNavigation?: boolean;
  timeout?: number;
}

/**
 * Helper para login como professor
 */
export async function loginAsTeacher(
  page: Page, 
  options: LoginOptions = {}
): Promise<void> {
  const { waitForNavigation = true, timeout = 10000 } = options;

  // Navegar para landing page
  await page.goto('/');
  
  // Clicar em "Sou Professor"
  await page.getByText('Sou Professor').click();
  await expect(page).toHaveURL('/login-professor');
  
  // Preencher formulário de login
  await page.fill('input[type="email"]', mockData.professor.user.email);
  await page.fill('input[type="password"]', 'password123');
  
  // Submeter formulário
  if (waitForNavigation) {
    await Promise.all([
      page.waitForURL('/professor/resumo', { timeout }),
      page.click('button[type="submit"]')
    ]);
  } else {
    await page.click('button[type="submit"]');
  }
  
  // Verificar se está logado
  await expect(page).toHaveURL('/professor/resumo');
  await expect(page.getByText('Professor Yago Sales')).toBeVisible();
}

/**
 * Helper para login como aluno
 */
export async function loginAsStudent(
  page: Page, 
  options: LoginOptions = {}
): Promise<void> {
  const { waitForNavigation = true, timeout = 10000 } = options;

  // Navegar para landing page
  await page.goto('/');
  
  // Clicar em "Sou Aluno"
  await page.getByText('Sou Aluno').click();
  await expect(page).toHaveURL('/login-aluno');
  
  // Preencher formulário de login
  await page.fill('input[type="email"]', mockData.aluno.user.email);
  await page.fill('input[type="password"]', 'password123');
  
  // Submeter formulário
  if (waitForNavigation) {
    await Promise.all([
      page.waitForURL('/aluno/dashboard', { timeout }),
      page.click('button[type="submit"]')
    ]);
  } else {
    await page.click('button[type="submit"]');
  }
  
  // Verificar se está logado
  await expect(page).toHaveURL('/aluno/dashboard');
  await expect(page.getByText('João Silva')).toBeVisible();
}

/**
 * Helper para logout
 */
export async function logout(page: Page): Promise<void> {
  // Procurar botão de logout (pode estar em diferentes lugares)
  const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("Sair"), button:has-text("Logout")').first();
  
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await expect(page).toHaveURL('/');
  }
}

/**
 * Helper para verificar se PDF viewer está funcionando
 */
export async function verifyPdfViewer(page: Page): Promise<void> {
  // Verificar se há iframe do PDF viewer
  const pdfIframe = page.locator('iframe[src*="viewer"], iframe[data-testid="pdf-viewer"]');
  
  if (await pdfIframe.isVisible()) {
    // Verificar se iframe carregou
    await expect(pdfIframe).toBeVisible();
    
    // Verificar se há conteúdo no iframe
    const iframeContent = page.frameLocator('iframe[src*="viewer"], iframe[data-testid="pdf-viewer"]');
    await expect(iframeContent.locator('body')).toBeVisible();
  } else {
    // Verificar se há link de fallback
    const fallbackLink = page.locator('a[href*=".pdf"], [data-testid="pdf-fallback"]');
    await expect(fallbackLink).toBeVisible();
  }
}

/**
 * Helper para verificar se página carregou sem erros
 */
export async function verifyPageLoaded(page: Page): Promise<void> {
  // Verificar se não há erros de console
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  await page.waitForLoadState('networkidle');
  
  // Filtrar erros críticos
  const criticalErrors = errors.filter(error => 
    !error.includes('Failed to load resource') && 
    !error.includes('404') &&
    !error.includes('CORS') &&
    !error.includes('favicon.ico') &&
    !error.includes('pdf.worker.mjs')
  );
  
  expect(criticalErrors).toHaveLength(0);
}

/**
 * Helper para aguardar elemento com timeout
 */
export async function waitForElement(
  page: Page, 
  selector: string, 
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector(selector, { timeout });
}

/**
 * Helper para verificar se elemento está visível
 */
export async function expectElementVisible(
  page: Page, 
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Helper para verificar se elemento não está visível
 */
export async function expectElementHidden(
  page: Page, 
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeHidden();
}

/**
 * Helper para verificar se URL contém texto
 */
export async function expectUrlContains(
  page: Page, 
  text: string
): Promise<void> {
  await expect(page).toHaveURL(new RegExp(text));
}

/**
 * Helper para verificar se título contém texto
 */
export async function expectTitleContains(
  page: Page, 
  text: string
): Promise<void> {
  await expect(page).toHaveTitle(new RegExp(text));
}

/**
 * Helper para aguardar navegação
 */
export async function waitForNavigation(
  page: Page, 
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout });
}

/**
 * Helper para verificar se toast apareceu
 */
export async function expectToast(
  page: Page, 
  text: string
): Promise<void> {
  const toast = page.locator('.Toastify__toast, [data-testid="toast"]');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(text);
}

/**
 * Helper para verificar se modal está aberto
 */
export async function expectModalOpen(
  page: Page, 
  modalTestId: string
): Promise<void> {
  const modal = page.locator(`[data-testid="${modalTestId}"]`);
  await expect(modal).toBeVisible();
}

/**
 * Helper para verificar se modal está fechado
 */
export async function expectModalClosed(
  page: Page, 
  modalTestId: string
): Promise<void> {
  const modal = page.locator(`[data-testid="${modalTestId}"]`);
  await expect(modal).toBeHidden();
}

/**
 * Helper para clicar em elemento por data-testid
 */
export async function clickByTestId(
  page: Page, 
  testId: string
): Promise<void> {
  await page.locator(`[data-testid="${testId}"]`).click();
}

/**
 * Helper para preencher campo por data-testid
 */
export async function fillByTestId(
  page: Page, 
  testId: string, 
  value: string
): Promise<void> {
  await page.locator(`[data-testid="${testId}"]`).fill(value);
}

/**
 * Helper para verificar se elemento por data-testid está visível
 */
export async function expectTestIdVisible(
  page: Page, 
  testId: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible();
}

/**
 * Helper para verificar se elemento por data-testid contém texto
 */
export async function expectTestIdContainsText(
  page: Page, 
  testId: string, 
  text: string
): Promise<void> {
  await expect(page.locator(`[data-testid="${testId}"]`)).toContainText(text);
}

/**
 * Helper para aguardar elemento por data-testid
 */
export async function waitForTestId(
  page: Page, 
  testId: string, 
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector(`[data-testid="${testId}"]`, { timeout });
}

/**
 * Helper para verificar performance da página
 */
export async function verifyPerformance(page: Page): Promise<void> {
  const startTime = Date.now();
  
  await page.waitForLoadState('networkidle');
  
  const loadTime = Date.now() - startTime;
  
  // Verificar se a página carrega em tempo razoável (10 segundos)
  expect(loadTime).toBeLessThan(10000);
  
  // Verificar se não há muitos recursos carregados
  const requests = await page.evaluate(() => {
    return performance.getEntriesByType('resource').length;
  });
  
  // Verificar se não há muitos requests (indicaria problema de performance)
  expect(requests).toBeLessThan(200);
}

/**
 * Helper para verificar responsividade
 */
export async function verifyResponsive(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  
  // Verificar se não há overflow horizontal
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(width + 20); // Margem de erro
  
  // Verificar se elementos essenciais estão visíveis
  await expect(page.locator('body')).toBeVisible();
}

/**
 * Helper para verificar se há erros de JavaScript
 */
export async function verifyNoJSErrors(page: Page): Promise<void> {
  const errors: string[] = [];
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  await page.waitForLoadState('networkidle');
  
  // Filtrar erros conhecidos que não são críticos
  const criticalErrors = errors.filter(error => 
    !error.includes('Failed to load resource') && 
    !error.includes('404') &&
    !error.includes('CORS') &&
    !error.includes('favicon.ico') &&
    !error.includes('pdf.worker.mjs') &&
    !error.includes('ChunkLoadError') &&
    !error.includes('Loading chunk')
  );
  
  expect(criticalErrors).toHaveLength(0);
}

export default {
  loginAsTeacher,
  loginAsStudent,
  logout,
  verifyPdfViewer,
  verifyPageLoaded,
  waitForElement,
  expectElementVisible,
  expectElementHidden,
  expectUrlContains,
  expectTitleContains,
  waitForNavigation,
  expectToast,
  expectModalOpen,
  expectModalClosed,
  clickByTestId,
  fillByTestId,
  expectTestIdVisible,
  expectTestIdContainsText,
  waitForTestId,
  verifyPerformance,
  verifyResponsive,
  verifyNoJSErrors,
};
