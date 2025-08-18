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
    <div className="pt-20 p-md">
      <h1 className="text-2xl font-bold mb-md">Corrigir Gabaritos</h1>
      <div className="bg-gray-50/30 backdrop-blur-md border border-gray-300 rounded-lg p-md shadow-subtle space-y-md">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-md items-end">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="mb-2 md:mb-0"
          />
          <button type="submit" className="btn-primary">
            Enviar
          </button>
        </form>
        {progress > 0 && progress < 100 && (
          <div className="w-full bg-gray-200 rounded h-4">
            <div
              className="bg-blue-500 h-4 rounded"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
        {error && <p className="text-red-500">{error}</p>}
      </div>
      {Array.isArray(results) && results.length > 0 && (
        <div className="mt-md bg-gray-50/30 backdrop-blur-md border border-gray-300 rounded-lg p-md shadow-subtle">
          <div className="overflow-x-auto">
            <table className="min-w-full border">
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
          </div>
        </div>
      )}
    </div>
  );
}

export default CorrigirGabaritos;
