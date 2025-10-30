import React from 'react';
import { Button } from '../../../components/ui/Button';

export function GradeWorkspace() {
  const [generating, setGenerating] = React.useState(false);

  function handleGeneratePdf() {
    setGenerating(true);
    // PDF generation logic here
    setTimeout(() => setGenerating(false), 2000);
  }

  return (
    <div className="grade-workspace">
      <aside className="left-rail">
        {/* Other left rail content */}
        <header className="head-group">
          <Button
            size="xs"
            className="btn btn--neutral rail-btn"
            onClick={handleOpenOriginal}
            title="Abrir original"
          >
            Abrir PDF
          </Button>
          {/* The other top button */}
        </header>
        <footer>
          <Button
            size="xs"
            className="btn btn--brand rail-btn rail-btn--primary"
            onClick={handleGeneratePdf}
            disabled={generating}
            title="Gerar PDF corrigido"
          >
            {generating ? 'Gerando…' : 'Gerar PDF'}
          </Button>
        </footer>
      </aside>
      {/* Rest of the workspace */}
    </div>
  );
}
