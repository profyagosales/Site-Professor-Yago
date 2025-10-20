export type GradeItemType = 'Prova' | 'Trabalho' | 'Projeto' | 'Teste' | 'Outros';

export type Bimester = 1 | 2 | 3 | 4;

export interface GradeItem {
  id: string;
  name: string;
  type: GradeItemType;
  points: number;
  color: string;
  bimester: Bimester;
}

export type GradeScheme = GradeItem[];
export type GradeSchemeByBimester = Record<Bimester, GradeItem[]>;

export interface GradeSchemeForProfessor {
  teacherId?: string;
  items: GradeScheme;
  updatedAt: string | null;
}
