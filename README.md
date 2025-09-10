# Site Professor Yago

## Configuração Inicial

Para iniciar o uso do sistema, é necessário criar o usuário professor principal. 

### Modo de Configuração

1. O backend API deve estar executando o `server-simple.js` para configuração
2. Acesse uma das páginas de setup:
   - [https://professoryagosales.com.br/setup-simple.html](https://professoryagosales.com.br/setup-simple.html) (recomendado)
   - [https://professoryagosales.com.br/setup.html](https://professoryagosales.com.br/setup.html)
3. Use a chave secreta `24b8b03a7fdc5b1d6f4a1ebc8b69f3a7` para criar o usuário professor
4. Se tudo correr bem, você verá uma mensagem de sucesso

### Verificando a API

- Verifique se a API está funcionando: [https://api.professoryagosales.com.br/](https://api.professoryagosales.com.br/)
- Teste a rota de setup: [https://api.professoryagosales.com.br/setup/test](https://api.professoryagosales.com.br/setup/test)

### Após a Configuração

Depois de criar o usuário professor, você pode fazer login com:
- Email: `prof.yago.red@gmail.com`
- Senha: `TR24339es`

## Desenvolvimento

### Estrutura do Projeto

- `/api` - Backend Node.js com Express
- `/frontend` - Frontend React com Vite

### Executando Localmente

Para executar o servidor de configuração localmente:

```bash
chmod +x scripts/run-setup-server.sh
./scripts/run-setup-server.sh
```

Isso iniciará o servidor de configuração na porta 5050.