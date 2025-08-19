# Frontend - Site Professor Yago

Aplicação React construída com Vite para a interface web do projeto.

## Scripts

Execute os comandos a partir do diretório `frontend`:

```bash
npm install           # instala dependências
npm run dev           # inicia servidor de desenvolvimento
npm test              # executa testes unitários
npm run lint          # verifica o lint
npm run build         # gera build de produção em dist/
npm run preview       # visualiza o build
```

Também é possível executar os scripts a partir da raiz do repositório adicionando `--prefix frontend`, por exemplo:

```bash
npm run dev --prefix frontend
```

## Usando a UI

### Authentication

Students and teachers must authenticate to receive a JWT token. The token is saved in `localStorage` and included in the `Authorization` header for subsequent requests.

```bash
curl -X POST http://localhost:5000/auth/login-student \
  -H "Content-Type: application/json" \
  -d '{"email":"aluno@example.com","password":"senha"}'
```

**Resposta**

```json
{ "token": "<jwt>" }
```

### Students

1. Acesse `/login-aluno` e faça login com seu e-mail e senha.
2. No painel, clique em **Enviar redação** para fazer upload de uma imagem.
3. O arquivo é enviado para `/redacoes/enviar` junto com turma e bimestre.
4. Acompanhe o status das suas redações no painel.

### Teachers

1. Acesse `/login-professor` e entre com suas credenciais.
2. Utilize o painel para navegar até **Redações** e revisar envios de alunos.
3. Os dados são obtidos de `/redacoes/professor?status=pendente` e podem ser filtrados por bimestre ou turma.
4. Marque as redações como corrigidas após a revisão.

Exemplo de listagem de redações:

```bash
curl "http://localhost:5000/redacoes/professor?status=pendente" \
  -H "Authorization: Bearer <token>"
```

```json
{ "redacoes": [] }
```
