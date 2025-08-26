# Redações API

Este módulo expõe endpoints para envio e consulta de redações.

## Autenticação

Todas as rotas requerem um token JWT obtido nos endpoints de login (`/api/auth/login-student` ou `/api/auth/login-teacher`).
Envie o token no cabeçalho `Authorization`:

```
Authorization: Bearer <token>
```

## Upload de Redações (Professor)

Para o fluxo novo de envio pelo professor, use o endpoint abaixo. O upload usa Cloudinary quando configurado; se não, há fallback opcional por URL direta.

### Variáveis de ambiente (Cloudinary)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ALLOW_DIRECT_FILE_URL` (opcional: `true` habilita aceitar `fileUrl`. Se o Cloudinary não estiver configurado, o fallback por URL já é aceito.)

### POST `/api/uploads/essay`

Headers
- `Authorization: Bearer <token>`
- Para arquivo: `Content-Type: multipart/form-data`

Body (multipart/form-data)
- `file`: PDF/Imagem da redação (quando usando upload)
- `studentId`: ID do aluno (obrigatório)
- `classId`: ID da turma (opcional; inferido do aluno se ausente)
- `topic`: tema da redação (obrigatório)

Body (JSON ou multipart) com URL
- `fileUrl`: URL http(s) do arquivo (fallback)
- `studentId`, `classId`, `topic` como acima

Exemplo (arquivo):
```bash
curl -X POST http://localhost:5000/api/uploads/essay \
  -H "Authorization: Bearer <token>" \
  -F "studentId=64fa..." \
  -F "classId=64fb..." \
  -F "topic=Tema livre" \
  -F "file=@/caminho/para/redacao.pdf"
```

Exemplo (URL):
```bash
curl -X POST http://localhost:5000/api/uploads/essay \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "64fa...",
    "classId": "64fb...",
    "topic": "Tema livre",
    "fileUrl": "https://exemplo.com/redacao.pdf"
  }'
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

