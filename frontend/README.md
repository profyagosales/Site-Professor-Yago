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
  -d '{"rollNumber":1,"phone":"999999999","password":"senha"}'
```

**Resposta**

```json
{
  "success": true,
  "message": "Login do aluno realizado com sucesso",
  "data": { "token": "<jwt>", "role": "student" }
}
```

### Students

1. Acesse `/login-aluno` e faça login com seu número, telefone e senha.
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

## Anotador de PDF (Rich Annotations)

Feature flags (definidas via `.env` do Vite):

- `VITE_USE_RICH_ANNOS`: habilita o novo anotador no workspace de correção (default true em dev).
- `VITE_VIRT_PDF`: liga a visualização virtualizada de páginas do PDF.
- `VITE_VIRT_BUFFER`: número de alturas de viewport como buffer (ex.: 2).

Ferramentas disponíveis: Seleção, Marca-texto, Caixa, Riscado, Caneta, Comentário e Borracha.

Atalhos rápidos:

- Ctrl/Cmd+Z: desfazer
- Ctrl/Cmd+Shift+Z ou Ctrl/Cmd+Y: refazer
- Delete/Backspace: apagar seleção
- Shift ao redimensionar: restringe proporções
- PageUp/PageDown ou botões ◀/▶: navegar páginas

Autosave: alterações são salvas automaticamente (com debounce) e também após intervalos de segurança.

Observação: quando virtualização estiver ativa (`VITE_VIRT_PDF=true`), apenas as páginas visíveis são renderizadas, melhorando a performance em PDFs longos.
