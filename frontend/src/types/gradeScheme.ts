export type GradeItemType = 'Prova' | 'Trabalho' | 'Projeto' | 'Teste' | 'Outros';

export interface GradeItem {
  id: string;
  name: string;
  points: number;
  type: GradeItemType;
  color: string;
}

export type Bimester = 1 | 2 | 3 | 4;
export type GradeSchemeByBimester = Record<Bimester, GradeItem[]>;

export interface GradeSchemeForProfessor {
  teacherId: string;
  scheme: GradeSchemeByBimester;
  updatedAt: string;
}
