import { test, expect } from '@playwright/test';

test.describe('Verificação do Seed de Desenvolvimento', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Dados do seed estão presentes no sistema', async ({ page }) => {
    // Fazer login como professor
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Verificar turmas criadas
    await page.click('text=Turmas');
    await expect(page.locator('text=3º A - Redação')).toBeVisible();
    await expect(page.locator('text=3º B - Literatura')).toBeVisible();

    // Verificar alunos
    await page.click('text=Alunos');
    await expect(page.locator('text=Ana Silva')).toBeVisible();
    await expect(page.locator('text=Bruno Santos')).toBeVisible();
    await expect(page.locator('text=Carlos Oliveira')).toBeVisible();

    // Verificar avisos
    await page.click('text=Avisos');
    await expect(page.locator('text=Aviso Imediato')).toBeVisible();
    await expect(page.locator('text=Prova Agendada')).toBeVisible();

    // Verificar redações
    await page.click('text=Redação');
    await expect(page.locator('text=Pendente')).toBeVisible();
    await expect(page.locator('text=Corrigida')).toBeVisible();
  });

  test('Login de aluno funciona com dados do seed', async ({ page }) => {
    // Clicar em "Sou Aluno"
    await page.click('text=Sou Aluno');
    await expect(page).toHaveURL(/.*login-aluno/);

    // Fazer login como aluno
    await page.fill('input[type="email"]', 'ana.silva@email.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Verificar se foi redirecionado para o dashboard do aluno
    await expect(page).toHaveURL(/.*aluno\/resumo/);
    
    // Verificar elementos do dashboard do aluno
    await expect(page.locator('h1')).toContainText('Resumo');
  });

  test('Dados de caderno estão presentes', async ({ page }) => {
    // Fazer login como professor
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Navegar para caderno
    await page.click('text=Caderno');
    await page.click('text=3º A');
    
    // Verificar se há registros de presença
    await expect(page.locator('text=Ana Silva')).toBeVisible();
    await expect(page.locator('text=Bruno Santos')).toBeVisible();
  });

  test('Gabaritos foram criados', async ({ page }) => {
    // Fazer login como professor
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Navegar para gabaritos
    await page.click('text=Gabarito');
    
    // Verificar se os gabaritos aparecem
    await expect(page.locator('text=Gabarito ENEM - Redação')).toBeVisible();
    await expect(page.locator('text=Gabarito PAS - Literatura')).toBeVisible();
  });
});
