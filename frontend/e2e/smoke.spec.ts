import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Fluxo Principal', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página inicial
    await page.goto('/');
  });

  test('Login do professor e navegação no dashboard', async ({ page }) => {
    // Clicar em "Sou Professor"
    await page.click('text=Sou Professor');
    await expect(page).toHaveURL(/.*login-professor/);

    // Fazer login
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Verificar se foi redirecionado para o dashboard
    await expect(page).toHaveURL(/.*professor\/resumo/);
    
    // Verificar elementos do dashboard
    await expect(page.locator('h1')).toContainText('Resumo');
    await expect(page.locator('[data-testid="summary-cards"]')).toBeVisible();
  });

  test('Navegação para turmas', async ({ page }) => {
    // Fazer login primeiro
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Navegar para turmas
    await page.click('text=Turmas');
    await expect(page).toHaveURL(/.*professor\/turmas/);
    
    // Verificar se as turmas aparecem
    await expect(page.locator('text=3º A')).toBeVisible();
    await expect(page.locator('text=3º B')).toBeVisible();
  });

  test('Acesso ao caderno do professor', async ({ page }) => {
    // Fazer login
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Navegar para caderno
    await page.click('text=Caderno');
    await expect(page).toHaveURL(/.*professor\/caderno/);
    
    // Verificar se as turmas aparecem para seleção
    await expect(page.locator('text=3º A')).toBeVisible();
    await expect(page.locator('text=3º B')).toBeVisible();
    
    // Clicar em uma turma
    await page.click('text=3º A');
    await expect(page).toHaveURL(/.*professor\/caderno\/.*/);
  });

  test('Acesso a gabaritos', async ({ page }) => {
    // Fazer login
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Navegar para gabaritos
    await page.click('text=Gabarito');
    await expect(page).toHaveURL(/.*professor\/gabarito/);
    
    // Verificar se as abas aparecem
    await expect(page.locator('text=Gabaritos em branco')).toBeVisible();
    await expect(page.locator('text=Aplicações')).toBeVisible();
    await expect(page.locator('text=Processamento')).toBeVisible();
  });

  test('Acesso a notas da classe', async ({ page }) => {
    // Fazer login
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Navegar para notas
    await page.click('text=Notas da Classe');
    await expect(page).toHaveURL(/.*professor\/notas-da-classe/);
    
    // Verificar se a página carrega
    await expect(page.locator('h1')).toContainText('Notas da Classe');
  });

  test('Exportação de notas gera arquivo', async ({ page }) => {
    // Fazer login
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Navegar para notas
    await page.click('text=Notas da Classe');
    
    // Aguardar carregamento e clicar em uma turma
    await page.waitForSelector('text=3º A');
    await page.click('text=3º A');
    
    // Aguardar carregamento da página de notas
    await page.waitForSelector('button:has-text("Exportar CSV/XLSX")');
    
    // Configurar listener para download
    const downloadPromise = page.waitForEvent('download');
    
    // Clicar no botão de exportação
    await page.click('button:has-text("Exportar CSV/XLSX")');
    
    // Selecionar formato CSV
    await page.click('button[data-format="csv"]');
    
    // Verificar se o download foi iniciado
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/notas_da_classe.*\.csv/);
  });

  test('Avisos agendados não aparecem antes da hora', async ({ page }) => {
    // Fazer login
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Navegar para avisos
    await page.click('text=Avisos');
    await expect(page).toHaveURL(/.*professor\/avisos/);
    
    // Verificar se apenas avisos imediatos aparecem
    await expect(page.locator('text=Aviso Imediato')).toBeVisible();
    
    // Verificar se avisos agendados não aparecem (status "Agendado")
    const scheduledAnnouncements = page.locator('text=Agendado');
    await expect(scheduledAnnouncements).toHaveCount(0);
  });

  test('Envio de e-mail apenas em redações corrigidas', async ({ page }) => {
    // Fazer login
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Navegar para redações
    await page.click('text=Redação');
    await expect(page).toHaveURL(/.*professor\/redacao/);
    
    // Verificar se há redações
    await page.waitForSelector('table tbody tr');
    
    // Verificar que redações pendentes não têm botão de e-mail habilitado
    const pendingRows = page.locator('tr').filter({ hasText: 'Pendente' });
    const pendingEmailButtons = pendingRows.locator('button:has-text("Enviar E-mail")');
    await expect(pendingEmailButtons.first()).toBeDisabled();
    
    // Verificar que redações corrigidas têm botão de e-mail habilitado
    const gradedRows = page.locator('tr').filter({ hasText: 'Corrigida' });
    const gradedEmailButtons = gradedRows.locator('button:has-text("Enviar E-mail"), button:has-text("Reenviar E-mail")');
    await expect(gradedEmailButtons.first()).toBeEnabled();
  });

  test('Navegação entre páginas funciona corretamente', async ({ page }) => {
    // Fazer login
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Testar navegação entre diferentes seções
    const menuItems = [
      { text: 'Resumo', url: /.*professor\/resumo/ },
      { text: 'Turmas', url: /.*professor\/turmas/ },
      { text: 'Alunos', url: /.*professor\/alunos/ },
      { text: 'Notas da Classe', url: /.*professor\/notas-da-classe/ },
      { text: 'Avisos', url: /.*professor\/avisos/ },
      { text: 'Caderno', url: /.*professor\/caderno/ },
      { text: 'Gabarito', url: /.*professor\/gabarito/ },
      { text: 'Redação', url: /.*professor\/redacao/ }
    ];

    for (const item of menuItems) {
      await page.click(`text=${item.text}`);
      await expect(page).toHaveURL(item.url);
      
      // Verificar se a página carregou (não há erro 404)
      await expect(page.locator('body')).not.toContainText('404');
      await expect(page.locator('body')).not.toContainText('Not Found');
    }
  });

  test('Responsividade em mobile', async ({ page }) => {
    // Configurar viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Fazer login
    await page.click('text=Sou Professor');
    await page.fill('input[type="email"]', 'professor@yagosales.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Verificar se o menu mobile funciona
    const menuButton = page.locator('button[aria-label="Menu"], button:has-text("Menu")');
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }
    
    // Verificar se as opções do menu aparecem
    await expect(page.locator('text=Turmas')).toBeVisible();
    await expect(page.locator('text=Notas da Classe')).toBeVisible();
  });
});