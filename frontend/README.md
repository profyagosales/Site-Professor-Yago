# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Using the UI

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
