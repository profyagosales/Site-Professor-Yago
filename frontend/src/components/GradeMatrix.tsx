/**
 * Componente de matriz de notas editável
 * 
 * Funcionalidades:
 * - Matriz editável com debounce
 * - Navegação por teclado (setas, Enter)
 * - Validação de notas
 * - Estados visuais (loading, erro)
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useGradeMatrix } from '@/hooks/useGradeMatrix';
import GradeInput from './GradeInput';
import { type Student, type Assessment } from '@/services/grades';

export interface GradeMatrixProps {
  classId: string;
  term: string;
  className?: string;
}

export default function GradeMatrix({ classId, term, className = '' }: GradeMatrixProps) {
  const {
    students,
    assessments,
    isLoading,
    isSaving,
    error,
    updateGrade,
    getGrade,
    getStudentAverage,
    clearError,
    focusCell,
    getCellId,
  } = useGradeMatrix({
    classId,
    term,
    showToasts: true,
    enableLogging: true,
  });

  const matrixRef = useRef<HTMLDivElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ studentIndex: number; assessmentIndex: number } | null>(null);

  // Navegação por teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent, studentIndex: number, assessmentIndex: number) => {
    const { key } = e;
    
    switch (key) {
      case 'ArrowUp':
        e.preventDefault();
        if (studentIndex > 0) {
          focusCell(studentIndex - 1, assessmentIndex);
        }
        break;
        
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        if (studentIndex < students.length - 1) {
          focusCell(studentIndex + 1, assessmentIndex);
        }
        break;
        
      case 'ArrowLeft':
        if (assessmentIndex > 0) {
          focusCell(studentIndex, assessmentIndex - 1);
        }
        break;
        
      case 'ArrowRight':
        if (assessmentIndex < assessments.length - 1) {
          focusCell(studentIndex, assessmentIndex + 1);
        }
        break;
        
      case 'Tab':
        // Deixar o comportamento padrão do Tab
        break;
        
      default:
        break;
    }
  }, [students.length, assessments.length, focusCellLocal]);

  // Focar em célula específica
  const focusCellLocal = useCallback((studentIndex: number, assessmentIndex: number) => {
    const cellId = getCellId(studentIndex, assessmentIndex);
    const cell = document.getElementById(cellId) as HTMLInputElement;
    
    if (cell) {
      cell.focus();
      cell.select();
      setFocusedCell({ studentIndex, assessmentIndex });
    }
  }, [getCellId]);

  // Efeito para focar na célula quando necessário
  useEffect(() => {
    if (focusedCell) {
      const cellId = getCellId(focusedCell.studentIndex, focusedCell.assessmentIndex);
      const cell = document.getElementById(cellId) as HTMLInputElement;
      
      if (cell) {
        cell.focus();
        cell.select();
      }
    }
  }, [focusedCell, getCellId]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-ys-ink-2">Carregando notas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-600 mb-2">{error}</p>
        <button 
          onClick={clearError}
          className="text-sm text-red-600 underline"
        >
          Fechar
        </button>
      </div>
    );
  }

  if (students.length === 0 || assessments.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-ys-ink-2">
          {students.length === 0 ? 'Nenhum aluno encontrado.' : 'Nenhuma avaliação encontrada.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="min-w-full">
        {/* Cabeçalho da tabela */}
        <div className="grid grid-cols-12 gap-1 mb-2">
          <div className="col-span-3 p-2 font-semibold text-sm text-gray-700 bg-gray-100 rounded">
            Aluno
          </div>
          {assessments.map((assessment, index) => (
            <div key={assessment.id} className="p-2 font-semibold text-sm text-gray-700 bg-gray-100 rounded text-center">
              <div className="truncate" title={assessment.title}>
                {assessment.title}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {assessment.weight}% • {assessment.maxScore}pts
              </div>
            </div>
          ))}
          <div className="col-span-1 p-2 font-semibold text-sm text-gray-700 bg-gray-100 rounded text-center">
            Média
          </div>
        </div>

        {/* Linhas dos alunos */}
        {students.map((student, studentIndex) => (
          <div key={student.id} className="grid grid-cols-12 gap-1 mb-1">
            {/* Nome do aluno */}
            <div className="col-span-3 p-2 bg-gray-50 rounded flex items-center">
              <div className="flex items-center gap-2">
                {student.photo && (
                  <img
                    src={student.photo}
                    alt={student.name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                )}
                <span className="text-sm font-medium text-gray-900 truncate">
                  {student.name}
                </span>
              </div>
            </div>

            {/* Notas do aluno */}
            {assessments.map((assessment, assessmentIndex) => (
              <div key={`${student.id}-${assessment.id}`} className="p-1">
                <GradeInput
                  value={getGrade(student.id, assessment.id)}
                  onChange={(value) => updateGrade(student.id, assessment.id, value)}
                  onKeyDown={(e) => handleKeyDown(e, studentIndex, assessmentIndex)}
                  disabled={!assessment.isActive}
                  loading={isSaving}
                  className="w-full"
                  data-testid={`grade-${studentIndex}-${assessmentIndex}`}
                  placeholder={assessment.isActive ? "0.0" : "N/A"}
                />
              </div>
            ))}

            {/* Média do aluno */}
            <div className="col-span-1 p-2 bg-gray-50 rounded flex items-center justify-center">
              <span className="text-sm font-medium text-gray-900">
                {getStudentAverage(student.id)?.toFixed(1) || '-'}
              </span>
            </div>
          </div>
        ))}

        {/* Rodapé com informações */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between text-sm text-blue-800">
            <div>
              <span className="font-medium">Dicas de navegação:</span>
              <span className="ml-2">
                Use as setas para navegar • Enter para ir para baixo • Tab para próxima célula
              </span>
            </div>
            {isSaving && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <span>Salvando...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
