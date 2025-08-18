# Redações API

Este módulo expõe endpoints para envio e consulta de redações.

## Autenticação

Todas as rotas requerem um token JWT obtido nos endpoints de login (`/auth/login-student` ou `/auth/login-teacher`).
Envie o token no cabeçalho `Authorization`:

```
Authorization: Bearer <token>
```

## POST `/redacoes/enviar`

Envia a imagem de uma redação de aluno. O arquivo é convertido em PDF e armazenado no servidor.

**Headers**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body (multipart/form-data)**
- `student`: ID do aluno
- `class`: ID da turma
- `bimester`: número do bimestre
- `file`: imagem (`.png` ou `.jpg`) da redação

**Exemplo de requisição**

```bash
curl -X POST http://localhost:5000/redacoes/enviar \
  -H "Authorization: Bearer <token>" \
  -F "student=64fa..." \
  -F "class=64fb..." \
  -F "bimester=1" \
  -F "file=@/caminho/para/redacao.jpg"
```

**Resposta (201)**

```json
{
  "redacao": {
    "_id": "64fc...",
    "student": "64fa...",
    "class": "64fb...",
    "bimester": 1,
    "file": "redacao-1690000000000.pdf",
    "submittedAt": "2024-01-01T12:00:00.000Z",
    "status": "pendente"
  }
}
```

## GET `/redacoes/professor`

Lista redações para correção ou consulta.

**Headers**
- `Authorization: Bearer <token>`

**Query params**
- `status` (obrigatório): `pendente` ou `corrigida`
- `bimestre` (opcional)
- `turma` (opcional): ID da turma
- `aluno` (opcional): ID do aluno
- `page` (opcional, padrão 1)
- `limit` (opcional, padrão 10)
- `sort` (opcional, padrão `-submittedAt`)

**Exemplo de requisição**

```bash
curl "http://localhost:5000/redacoes/professor?status=pendente&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Resposta (200)**

```json
{
  "redacoes": [
    {
      "_id": "64fc...",
      "student": { "name": "Aluno", "rollNumber": "123" },
      "class": { "series": 1, "letter": "A" },
      "bimester": 1,
      "file": "redacao-1690000000000.pdf",
      "submittedAt": "2024-01-01T12:00:00.000Z",
      "status": "pendente"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

