# Guia do Usuário

Este guia descreve os principais fluxos do sistema: login de professor e aluno, envio de redação, correção e visualização de notas.

## Login do Professor
1. Acesse `/login-professor`.
2. Insira e-mail e senha cadastrados e clique em **Entrar**.
3. Em caso de sucesso, o sistema redireciona para `/dashboard-professor`.
4. Exemplo de requisição:
   ```
   POST /auth/login-teacher
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
   POST /auth/login-student
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
2. Após revisar o conteúdo, envie a correção:
   ```
   POST /redacoes/:id/corrigir
   {
     "correction": "Observações e sugestões",
     "nota": 9.5
   }
   ```
3. O status passa para **corrigida** e um PDF com comentários pode ser gerado.

## Visualização de Notas
- **Aluno**: no `/dashboard-aluno`, acesse **Minhas Notas** para ver o histórico.
  ```
  GET /alunos/:id/notas
  ```
- **Professor**: em `/notas-classe`, acompanhe as notas da turma ou veja detalhes de um aluno específico.
  ```
  GET /alunos/:id/notas
  ```
