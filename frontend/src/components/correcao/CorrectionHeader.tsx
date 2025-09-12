
import React from 'react';

interface CorrectionHeaderProps {
  studentData: {
    name: string;
    avatarUrl: string;
    class?: string;
    essayTheme: string;
    model: 'ENEM' | 'PAS' | 'PAS/UnB';
  };
}

const CorrectionHeader: React.FC<CorrectionHeaderProps> = ({ studentData }) => {
  return (
    <header className="bg-white p-3 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center">
        <img src={studentData.avatarUrl} alt={studentData.name} className="w-10 h-10 rounded-full mr-4" />
        <div>
          <h1 className="text-lg font-semibold">{studentData.name}</h1>
          <p className="text-sm text-gray-600">
            {studentData.class} - {studentData.essayTheme}
          </p>
        </div>
      </div>
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-700 mr-2">Modelo:</span>
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
          {studentData.model}
        </span>
      </div>
    </header>
  );
};

export default CorrectionHeader;
