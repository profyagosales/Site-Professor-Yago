import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { corrigirRedacao } from '../services/redacoes';

function CorrigirRedacao() {
  const { id } = useParams();
  const [tipo, setTipo] = useState('ENEM');
  const annulmentOptions = [
    { key: 'fugaTema', label: 'Fuga ao tema' },
    { key: 'textoInsuficiente', label: 'Texto insuficiente' },
    { key: 'textoIlegivel', label: 'Texto ilegível' },
    { key: 'assinatura', label: 'Assinatura ou marca identificadora' },
  ];
  const [checklist, setChecklist] = useState(
    annulmentOptions.reduce((acc, opt) => ({ ...acc, [opt.key]: false }), {})
  );
  const [competencias, setCompetencias] = useState(
    Array.from({ length: 5 }, () => ({ pontuacao: 0, comentario: '' }))
  );
  const [nc, setNc] = useState(0);
  const [ne, setNe] = useState(0);
  const [nl, setNl] = useState(1);
  const essayRef = useRef(null);
  const [comments, setComments] = useState([]);

  const anulacao = Object.values(checklist).some(Boolean);
  const totalEnem = anulacao
    ? 0
    : competencias.reduce((sum, c) => sum + Number(c.pontuacao || 0), 0);
  const pasScore = nl ? nc - (2 * ne) / nl : 0;

  const handleChecklistChange = (key) => {
    setChecklist({ ...checklist, [key]: !checklist[key] });
  };

  const handleCompetenciaChange = (idx, field, value) => {
    setCompetencias((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  const handleAddComment = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === '') return;
    const comment = prompt('Comentário');
    if (!comment) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement('mark');
    span.className = 'bg-yellow-200';
    span.setAttribute('data-comment', comment);
    try {
      range.surroundContents(span);
    } catch {
      // ignore if invalid selection
    }
    setComments((prev) => [...prev, { text: selection.toString(), comment }]);
    selection.removeAllRanges();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { tipo, comentariosTexto: comments };
    if (tipo === 'ENEM') {
      payload.checklist = checklist;
      payload.competencias = competencias.map((c) => ({
        pontuacao: Number(c.pontuacao),
        comentario: c.comentario,
      }));
      payload.anulacao = anulacao;
    } else {
      payload.NC = Number(nc);
      payload.NE = Number(ne);
      payload.NL = Number(nl);
    }
    try {
      await corrigirRedacao(id, payload);
      alert('Correção salva');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar correção');
    }
  };

  return (
    <form onSubmit={handleSave} className="pt-20 p-md space-y-md">
      <h1 className="text-2xl font-bold">Corrigir Redação</h1>

      <div className="space-y-sm">
        <label className="block font-medium">Tipo de correção</label>
        <select
          className="border p-sm rounded"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="ENEM">ENEM</option>
          <option value="PAS/UnB">PAS/UnB</option>
        </select>
      </div>

      {tipo === 'ENEM' && (
        <div className="space-y-md">
          <div className="space-y-sm">
            <h2 className="font-semibold">Condições de anulação</h2>
            {annulmentOptions.map((opt) => (
              <label key={opt.key} className="block">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={checklist[opt.key]}
                  onChange={() => handleChecklistChange(opt.key)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div className="space-y-sm">
            <h2 className="font-semibold">Competências</h2>
            {competencias.map((c, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-sm items-start sm:items-center">
                <label className="w-32">Competência {idx + 1}</label>
                <select
                  value={c.pontuacao}
                  disabled={anulacao}
                  onChange={(e) =>
                    handleCompetenciaChange(idx, 'pontuacao', Number(e.target.value))
                  }
                  className="border p-sm rounded"
                >
                  {[0, 40, 80, 120, 160, 200].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Comentário"
                  disabled={anulacao}
                  value={c.comentario}
                  onChange={(e) =>
                    handleCompetenciaChange(idx, 'comentario', e.target.value)
                  }
                  className="border p-sm rounded flex-1"
                />
              </div>
            ))}
            <p className="font-medium">Nota final: {totalEnem}</p>
          </div>
        </div>
      )}

      {tipo === 'PAS/UnB' && (
        <div className="space-y-sm">
          <div className="flex flex-col sm:flex-row gap-sm items-center">
            <label className="w-24">NC</label>
            <input
              type="number"
              className="border p-sm rounded flex-1"
              value={nc}
              onChange={(e) => setNc(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-sm items-center">
            <label className="w-24">NE</label>
            <input
              type="number"
              className="border p-sm rounded flex-1"
              value={ne}
              onChange={(e) => setNe(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-sm items-center">
            <label className="w-24">NL</label>
            <input
              type="number"
              className="border p-sm rounded flex-1"
              value={nl}
              onChange={(e) => setNl(Number(e.target.value))}
            />
          </div>
          <p className="font-medium">Nota final: {pasScore.toFixed(2)}</p>
        </div>
      )}

      <div className="space-y-sm">
        <h2 className="font-semibold">Texto da redação</h2>
        <div
          ref={essayRef}
          contentEditable
          suppressContentEditableWarning={true}
          className="border p-sm min-h-[200px] rounded"
        ></div>
        <button type="button" className="btn-primary" onClick={handleAddComment}>
          Adicionar comentário
        </button>
        {comments.length > 0 && (
          <ul className="list-disc pl-md space-y-xs">
            {comments.map((c, i) => (
              <li key={i}>
                <strong>{c.text}</strong>: {c.comment}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit" className="btn-primary">
        Salvar
      </button>
    </form>
  );
}

export default CorrigirRedacao;

