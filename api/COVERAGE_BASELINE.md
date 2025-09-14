# Baseline de Cobertura de Testes

Data inicial: 2025-09-14

Resumo atual (após inclusão de testes unitários e de integração principais):

- Cobertura Global (linhas): ~43%
- Services principais:
  - statusService: 100% linhas
  - scoringService: 94% linhas
  - pdfService: 87% linhas
- Middleware principais (segurança / observabilidade):
  - inputSanitizer: 100%
  - securityHeaders: 100%
  - rateLimit: 81%
  - metrics: 88%
  - auth: 49% (caminhos não exercidos relacionados a cookies e múltiplas falhas)

Áreas com baixa cobertura:
- Controllers (10% - 28% linhas) — fluxo crítico principal coberto via `statusFlow.test.js`, porém muitos endpoints CRUD e casos de erro ainda sem testes.
- emailService (36%) — somente caminho de sucesso indireto via fluxo de status.

## Metas

Curto prazo (próximo ciclo):
- Atingir >= 60% linhas global
- Elevar auth middleware para >= 70% (adicionar cenários de falha cookie ausente, token inválido, papel inadequado)
- Adicionar testes para pelo menos 1 controller adicional (themes ou classes) abrangendo sucesso + erro

Médio prazo:
- >= 75% global
- Adicionar testes para uploadsController (validação mime) e studentsController (listagens)
- Cobrir cenários de anulação ENEM/PAS no fluxo de integração

Longo prazo:
- Estabilizar entre 80%-85% global priorizando caminhos de negócio reais; não perseguir 100% artificial.

## Estratégia
1. Priorizar rotas com lógica de negócio (ex: `essaysController` caminhos de erro, `themesController` arquivamento).
2. Utilizar factories utilitárias para criar usuários / classes para reduzir repetição.
3. Mockar serviços externos somente onde necessário (Cloudinary, email, PDF) mantendo integração real entre middlewares.
4. Medir evolução em cada PR usando script `npm run test:ci`.

---
Gerado automaticamente como baseline inicial.
