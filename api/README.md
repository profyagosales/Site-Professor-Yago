# Backend da Plataforma de Redações

Este é o backend da plataforma de correção de redações do Professor Yago Sales. A API fornece endpoints para gerenciar usuários, temas, redações, anotações e envio de e-mails.

## Estrutura do Projeto

```
api/
  ├── app.js              # Configuração do Express e rotas
  ├── server.js           # Ponto de entrada da aplicação
  ├── config/             # Configurações (db, cors, etc)
  ├── controllers/        # Controladores para cada recurso
  ├── middleware/         # Middlewares (auth, error handler, etc)
  ├── models/             # Modelos Mongoose
  ├── routes/             # Definições de rotas
  ├── services/           # Serviços externos (email, cloudinary, pdf)
  └── utils/              # Utilitários e helpers
```

## Dependências Principais

- Express: Framework web
- Mongoose: ODM para MongoDB
- jsonwebtoken: Autenticação JWT
- multer: Upload de arquivos
- pdf-lib: Manipulação de PDFs
- cloudinary: Armazenamento de arquivos
- nodemailer: Envio de e-mails

## Rotas Principais

### Autenticação
- `POST /auth/login-teacher`: Login para professores
- `POST /auth/login-student`: Login para alunos
- `GET /auth/me`: Obter perfil do usuário autenticado

### Temas
- `GET /themes`: Listar temas (paginado/filtrado)
- `POST /themes`: Criar novo tema
- `PUT /themes/:id`: Atualizar tema
- `DELETE /themes/:id`: Excluir tema

### Redações
- `GET /essays`: Listar redações
- `POST /essays`: Criar nova redação
- `GET /essays/:id`: Obter detalhes de uma redação
- `PUT /essays/:id`: Atualizar redação

### Anotações e Correção
- `GET /essays/:id/annotations`: Obter anotações de uma redação
- `PUT /essays/:id/annotations`: Atualizar anotações
- `PUT /essays/:id/grade`: Atribuir nota (ENEM/PAS)

### Upload e Acesso a Arquivos
- `POST /uploads/essay`: Upload de arquivo PDF
- `POST /essays/:id/file-token`: Gerar token para acesso ao arquivo
- `GET /essays/:id/file`: Obter arquivo original
- `POST /essays/:id/export`: Gerar PDF corrigido
- `POST /essays/:id/send-email`: Enviar PDF corrigido por e-mail

## Modelos de Dados

### User
- Campos: name, email, passwordHash, role ('teacher'|'student'), photoUrl
- Métodos: comparePassword

### Theme
- Campos: title, active, createdAt, createdBy

### Essay
- Campos: studentId, teacherId, type ('ENEM'|'PAS'), themeId/themeText, status, file
- Notas: enem (c1..c5), pas (NC, NE, NL)
- Anulação: annulment.active, annulment.reasons

### AnnotationSet
- Campos: essayId, highlights (page, rects, color, category, comment), comments
