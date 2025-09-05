import { Page } from '@/components/Page';
import EssayThemesManager from '@/components/EssayThemesManager';

export default function TemasRedacao() {
  return (
    <Page title="Temas de Redação" subtitle="Gerencie os temas disponíveis para redações">
      <EssayThemesManager />
    </Page>
  );
}
