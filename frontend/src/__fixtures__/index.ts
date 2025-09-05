/**
 * Índice das fixtures de dados
 * 
 * Centraliza todas as fixtures para facilitar importação
 */

export * from './students';
export * from './classes';
export * from './essays';
export * from './essayThemes';
export * from './grades';
export * from './diary';

// Re-exports para facilitar importação
export { default as students } from './students';
export { default as classes } from './classes';
export { default as essays } from './essays';
export { default as essayThemes } from './essayThemes';
export { default as grades } from './grades';
export { default as diary } from './diary';

// Dados combinados para seed completo
import studentsData from './students';
import classesData from './classes';
import essaysData from './essays';
import essayThemesData from './essayThemes';
import gradesData from './grades';
import diaryData from './diary';

export const seedData = {
  students: studentsData,
  classes: classesData,
  essays: essaysData,
  essayThemes: essayThemesData,
  grades: gradesData,
  diary: diaryData,
};
