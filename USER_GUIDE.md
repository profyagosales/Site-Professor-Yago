# Guia do Usuário

Este guia descreve os principais fluxos do sistema: login de professor e aluno, envio de redação, correção e visualização de notas.

## Login do Professor
1. Acesse `/login-professor`.
2. Insira e-mail e senha cadastrados e clique em **Entrar**.
3. Em caso de sucesso, o sistema redireciona para `/professor/resumo`.
4. Exemplo de requisição:
   ```
   POST /api/auth/login-teacher
   {
     "email": "prof@example.com",
     "password": "senha"
   }
   ```

## Login do Aluno
1. Acesse `/login-aluno`.
2. Informe seu número, telefone e senha e clique em **Entrar**.
3. Após o login, você é direcionado para `/dashboard-aluno`.
4. Exemplo de requisição:
   ```
   POST /api/auth/login-student
   {
     "rollNumber": 1,
     "phone": "999999999",
     "password": "senha"
   }
   ```

## Envio de Redação
1. O aluno acessa `/dashboard-aluno` e seleciona **Enviar Redação**.
2. Preencha turma e bimestre, anexe o PDF e confirme.
3. Exemplo de rota:
   ```
   POST /redacoes/enviar
   FormData: file, turma, bimestre
   ```

## Correção de Redação
1. O professor abre `/dashboard-redacoes` e escolhe uma redação pendente.
2. Ao abrir a redação, o workspace pode utilizar o novo anotador de PDF (quando habilitado via `VITE_USE_RICH_ANNOS=true`). As ferramentas permitem marca-texto, caixa, riscado, caneta e comentários com movimentação e redimensionamento. As alterações têm desfazer/refazer e salvamento automático. Mesmo que o link do arquivo não tenha a extensão `.pdf`, o editor inline será utilizado se o backend informar `originalMimeType: application/pdf` (o sistema detecta isso no upload ou via uma consulta HEAD best-effort).
3. Após revisar o conteúdo, envie a correção:
   ```
   POST /redacoes/:id/corrigir
   {
     "correction": "Observações e sugestões",
     "nota": 9.5
   }
   ```
4. O status passa para **corrigida** e um PDF com comentários/anotações é gerado. Quando o anotador rico está habilitado, o PDF inclui miniaturas com as marcações e um resumo por página das anotações.

### Desempenho com PDFs longos

Quando `VITE_VIRT_PDF=true`, o visualizador utiliza virtualização para renderizar apenas as páginas visíveis, melhorando a fluidez. Ajuste `VITE_VIRT_BUFFER` para controlar o buffer de páginas além da viewport.

## Visualização de Notas
- **Aluno**: no `/dashboard-aluno`, acesse **Minhas Notas** para ver o histórico.
  ```
  GET /alunos/:id/notas
  ```
- **Professor**: em `/notas-classe`, acompanhe as notas da turma ou veja detalhes de um aluno específico.
  ```
  GET /alunos/:id/notas
  ```
