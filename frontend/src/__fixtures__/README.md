# Fixtures de Dados

Este diretório contém dados de teste consistentes e reutilizáveis para o projeto.

## Estrutura

```
__fixtures__/
├── README.md           # Este arquivo
├── index.ts           # Exportações centralizadas
├── testUtils.ts       # Utilitários para testes
├── students.ts        # Dados de estudantes
├── classes.ts         # Dados de turmas
├── essays.ts          # Dados de redações
├── essayThemes.ts     # Dados de temas de redação
├── grades.ts          # Dados de notas e avaliações
└── diary.ts           # Dados de diário (presença)
```

## Uso

### Importação Básica

```typescript
import { students, classes, essays } from '@/__fixtures__';
```

### Importação com Utilitários

```typescript
import { studentUtils, classUtils, essayUtils } from '@/__fixtures__/testUtils';
```

### Exemplos de Uso

#### Estudantes

```typescript
// Obter estudante por ID
const student = studentUtils.getById('student-1');

// Obter estudantes por turma
const classStudents = studentUtils.getByClass('class-1');

// Gerar estudante mock
const mockStudent = studentUtils.generateMock({
  name: 'Nome Teste',
  email: 'teste@escola.com'
});
```

#### Turmas

```typescript
// Obter turma por ID
const classData = classUtils.getById('class-1');

// Obter turmas por série
const ninthGradeClasses = classUtils.getBySeries(9);

// Gerar turma mock
const mockClass = classUtils.generateMock({
  series: 8,
  letter: 'B',
  discipline: 'História'
});
```

#### Redações

```typescript
// Obter redações por status
const pendingEssays = essayUtils.getByStatus('pendente');

// Obter redações por tipo
const enemEssays = essayUtils.getByType('ENEM');

// Gerar redação mock
const mockEssay = essayUtils.generateMock({
  topic: 'Tema Teste',
  type: 'PAS',
  status: 'corrigida'
});
```

## Dados Disponíveis

### Estudantes (10 registros)
- **IDs**: `student-1` a `student-10`
- **Turmas**: 5 turmas diferentes (7º A, 8º A, 8º B, 9º A, 9º B)
- **Séries**: 7, 8 e 9
- **Disciplinas**: Matemática, Português, História, Geografia, Ciências

### Turmas (5 registros)
- **IDs**: `class-1` a `class-5`
- **Séries**: 7, 8 e 9
- **Letras**: A e B
- **Disciplinas**: Matemática, Português, História, Geografia, Ciências
- **Professores**: 5 professores diferentes

### Redações (10 registros)
- **IDs**: `essay-1` a `essay-10`
- **Status**: pendente, corrigida
- **Tipos**: ENEM, PAS, outro
- **Bimestres**: 1º bimestre
- **Notas**: 7.5 a 9.2 (apenas redações corrigidas)

### Temas de Redação (11 registros)
- **IDs**: `theme-1` a `theme-11`
- **Tipos**: ENEM, PAS, outro
- **Status**: 10 ativos, 1 inativo
- **Uso**: Contadores de uso por tema

### Notas e Avaliações
- **Avaliações**: 8 registros (provas, trabalhos, apresentações, projetos)
- **Notas**: 18 registros
- **Turmas**: Todas as 5 turmas
- **Valores**: 7.5 a 9.5

### Diário (17 registros)
- **Período**: 5 dias (15/01 a 19/01/2024)
- **Turmas**: class-1 e class-2
- **Presença**: Dados realistas de presença/ausência
- **Atividades**: Descrições detalhadas das aulas

## Relacionamentos

Os dados são consistentes entre si:

- **Estudantes ↔ Turmas**: Cada estudante pertence a uma turma válida
- **Redações ↔ Estudantes**: Cada redação pertence a um estudante válido
- **Notas ↔ Estudantes**: Cada nota pertence a um estudante válido
- **Notas ↔ Avaliações**: Cada nota pertence a uma avaliação válida
- **Diário ↔ Estudantes**: Cada entrada pertence a um estudante válido

## Validação

Todos os utilitários incluem funções de validação:

```typescript
// Validar estrutura de dados
const isValid = studentUtils.validate(studentData);

// Verificar propriedades obrigatórias
const hasRequired = testUtils.hasRequiredProperties(obj, ['id', 'name']);
```

## Geração de Mocks

Para testes que precisam de dados únicos:

```typescript
// Gerar ID único
const id = testUtils.generateId('student');

// Gerar data ISO
const date = testUtils.generateDate(0); // hoje
const tomorrow = testUtils.generateDate(1); // amanhã

// Gerar dados mock
const mockStudent = studentUtils.generateMock({
  name: 'Nome Único',
  email: 'email@unico.com'
});
```

## Seed de Desenvolvimento

As fixtures são usadas pelo script de seed:

```bash
# Seed com dados estáticos
npm run seed:dev

# Seed via backend
npm run seed:dev:backend

# Seed limpando dados existentes
npm run seed:dev:clear
```

## Manutenção

- **Adicionar dados**: Crie novos registros seguindo o padrão existente
- **Atualizar relacionamentos**: Mantenha consistência entre entidades
- **Validar dados**: Use as funções de validação fornecidas
- **Testar mudanças**: Execute `npm test` para verificar integridade
