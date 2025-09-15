import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

// Mapeia status para estilos
const statusStyles: Record<string, string> = {
  PENDING: 'bg-gray-200 text-gray-700',
  GRADING: 'bg-yellow-100 text-yellow-700',
  GRADED: 'bg-green-100 text-green-700',
  SENT: 'bg-blue-100 text-blue-700',
  ANNULLED: 'bg-red-100 text-red-700'
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  GRADING: 'Em andamento',
  GRADED: 'Corrigida',
  SENT: 'Enviada',
  ANNULLED: 'Anulada'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const base = 'inline-block px-2 py-0.5 rounded text-xs font-medium';
  const style = statusStyles[status] || 'bg-gray-100 text-gray-600';
  const label = statusLabels[status] || status;
  return <span className={`${base} ${style} ${className}`}>{label}</span>;
};

export default StatusBadge;
