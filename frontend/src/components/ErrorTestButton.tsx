import React, { useState } from 'react';

export default function ErrorTestButton() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    // Simular erro de render
    throw new Error('Erro de teste do ErrorBoundary');
  }

  if (import.meta.env.DEV) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShouldError(true)}
          className="px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 shadow-lg"
          title="Testar ErrorBoundary (apenas DEV)"
        >
          🧪 Testar Erro
        </button>
      </div>
    );
  }

  return null;
}
