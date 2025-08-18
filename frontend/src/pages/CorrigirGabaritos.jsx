import { useState } from 'react';
import { uploadPdf } from '../services/omr';

function CorrigirGabaritos() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setProgress(0);
    setError('');
    try {
      const data = await uploadPdf(file, (evt) => {
        if (evt.total) {
          setProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      });
      setResults(data.students || data);
    } catch {
      setError('Falha ao enviar PDF');
    }
  };

  return (
    <div className="p-4 mt-16">
      <h1 className="text-2xl font-bold mb-4">Corrigir Gabaritos</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-2"
        />
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
          Enviar
        </button>
      </form>
      {progress > 0 && progress < 100 && (
        <div className="w-full bg-gray-200 rounded h-4 mb-4">
          <div
            className="bg-blue-500 h-4 rounded"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}
      {Array.isArray(results) && results.length > 0 && (
        <table className="min-w-full border mt-4">
          <thead>
            <tr>
              <th className="border px-2 py-1">Aluno</th>
              <th className="border px-2 py-1">Nota</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => (
              <tr key={idx}>
                <td className="border px-2 py-1">{r.name || r.student}</td>
                <td className="border px-2 py-1 text-center">{r.grade || r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default CorrigirGabaritos;
