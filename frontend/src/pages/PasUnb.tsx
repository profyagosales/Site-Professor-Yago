import { Card, CardBody } from '@/components/ui/Card';

export default function PasUnbPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Card className="border-none bg-gradient-to-br from-[#00c4cc] to-[#3e9d5a] text-white shadow-xl rounded-3xl">
        <CardBody className="p-10 sm:p-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Informações, conteúdos e dicas sobre o PAS/UnB em breve.
          </h2>
        </CardBody>
      </Card>
    </section>
  );
}
