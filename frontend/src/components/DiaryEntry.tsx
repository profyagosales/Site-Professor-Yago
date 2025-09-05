/**
 * Componente para entrada de dados do diário
 * 
 * Funcionalidades:
 * - Checkbox de presença
 * - Textarea de atividade
 * - Validação de caracteres
 * - Estados visuais
 */

import { useState, useRef, useEffect } from 'react';
import { type DiaryEntry, type Student } from '@/services/diary';

export interface DiaryEntryProps {
  student: Student;
  entry: DiaryEntry | null;
  onUpdate: (studentId: string, updates: Partial<DiaryEntry>) => void;
  disabled?: boolean;
  className?: string;
}

export default function DiaryEntry({
  student,
  entry,
  onUpdate,
  disabled = false,
  className = '',
}: DiaryEntryProps) {
  const [activity, setActivity] = useState(entry?.activity || '');
  const [isPresent, setIsPresent] = useState(entry?.isPresent ?? true);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sincronizar com entrada externa
  useEffect(() => {
    if (!isFocused) {
      setActivity(entry?.activity || '');
      setIsPresent(entry?.isPresent ?? true);
    }
  }, [entry, isFocused]);

  const handlePresentChange = (present: boolean) => {
    setIsPresent(present);
    onUpdate(student.id, { isPresent: present });
  };

  const handleActivityChange = (value: string) => {
    // Limita a 500 caracteres
    const limitedValue = value.substring(0, 500);
    setActivity(limitedValue);
    onUpdate(student.id, { activity: limitedValue });
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const getTextareaClasses = () => {
    const baseClasses = 'w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';
    
    if (isFocused) {
      return `${baseClasses} border-blue-300 bg-blue-50`;
    }
    
    return `${baseClasses} border-gray-300`;
  };

  const getCheckboxClasses = () => {
    const baseClasses = 'w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    if (isPresent) {
      return `${baseClasses} border-green-300 bg-green-50`;
    }
    
    return `${baseClasses} border-red-300 bg-red-50`;
  };

  return (
    <div className={`flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Avatar e nome do aluno */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {student.photo && (
          <img
            src={student.photo}
            alt={student.name}
            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {student.name}
          </h3>
          {student.email && (
            <p className="text-xs text-gray-500 truncate">
              {student.email}
            </p>
          )}
        </div>
      </div>

      {/* Checkbox de presença */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPresent}
            onChange={(e) => handlePresentChange(e.target.checked)}
            disabled={disabled}
            className={getCheckboxClasses()}
          />
          <span className={`text-sm font-medium ${isPresent ? 'text-green-700' : 'text-red-700'}`}>
            {isPresent ? 'Presente' : 'Ausente'}
          </span>
        </label>
      </div>

      {/* Textarea de atividade */}
      <div className="flex-1 min-w-0">
        <label htmlFor={`activity-${student.id}`} className="block text-xs font-medium text-gray-700 mb-1">
          Atividade
        </label>
        <textarea
          ref={textareaRef}
          id={`activity-${student.id}`}
          value={activity}
          onChange={(e) => handleActivityChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="Descreva a atividade realizada..."
          className={getTextareaClasses()}
          rows={2}
          maxLength={500}
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500">
            {activity.length}/500 caracteres
          </span>
          {activity.length > 450 && (
            <span className="text-xs text-orange-600">
              Quase no limite
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
