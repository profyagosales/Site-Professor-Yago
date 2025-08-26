// Reexporta explicitamente a partir do serviço TypeScript (renomeado) para evitar colisão com students.js (legacy)
export { searchStudents, getStudent, getStudentEssays } from './studentsV2';
export { default } from './studentsV2';