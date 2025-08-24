import { Page } from "@/components/Page";
import { Button } from "@/components/ui/Button";
import { Table, Th, Td } from "@/components/ui/Table";

export default function TurmaAlunosPage() {
  const alunos = [
    { id: 1, nome: "João Silva", email: "joao@ex.com" },
  ];

  return (
    <Page title="2º B — Português" subtitle="Alunos cadastrados">
      <div className="mb-4">
        <Button onClick={() => {}}>Novo Aluno</Button>
      </div>

      <Table>
        <thead>
          <tr><Th>Nome</Th><Th>E-mail</Th><Th>Ações</Th></tr>
        </thead>
        <tbody>
          {alunos.map(a => (
            <tr key={a.id}>
              <Td>{a.nome}</Td>
              <Td>{a.email}</Td>
              <Td>
                <div className="flex gap-2">
                  <Button variant="ghost">Editar</Button>
                  <Button variant="ghost">Remover</Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Page>
  );
}

