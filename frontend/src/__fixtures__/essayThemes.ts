/**
 * Fixtures de dados para temas de redação
 * 
 * Dados consistentes para testes e desenvolvimento
 */

export interface EssayThemeFixture {
  id: string;
  name: string;
  type: 'ENEM' | 'PAS' | 'outro';
  description?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export const essayThemes: EssayThemeFixture[] = [
  {
    id: 'theme-1',
    name: 'Mobilidade Urbana Sustentável',
    type: 'ENEM',
    description: 'Desafios e soluções para o transporte urbano sustentável',
    isActive: true,
    usageCount: 15,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'theme-2',
    name: 'Inclusão Digital na Educação',
    type: 'PAS',
    description: 'O papel da tecnologia na democratização do ensino',
    isActive: true,
    usageCount: 12,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'theme-3',
    name: 'Sustentabilidade Ambiental',
    type: 'ENEM',
    description: 'Preservação do meio ambiente e desenvolvimento sustentável',
    isActive: true,
    usageCount: 18,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'theme-4',
    name: 'Democracia e Participação Social',
    type: 'PAS',
    description: 'A importância da participação cidadã na democracia',
    isActive: true,
    usageCount: 8,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'theme-5',
    name: 'Tecnologia e Sociedade',
    type: 'ENEM',
    description: 'Impactos da tecnologia na sociedade contemporânea',
    isActive: true,
    usageCount: 22,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'theme-6',
    name: 'História do Brasil Colonial',
    type: 'outro',
    description: 'Período colonial brasileiro e suas características',
    isActive: true,
    usageCount: 5,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'theme-7',
    name: 'Revolução Industrial',
    type: 'outro',
    description: 'Transformações sociais e econômicas da Revolução Industrial',
    isActive: true,
    usageCount: 7,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'theme-8',
    name: 'Geografia Física do Brasil',
    type: 'outro',
    description: 'Características físicas e geográficas do território brasileiro',
    isActive: true,
    usageCount: 6,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'theme-9',
    name: 'Biodiversidade Amazônica',
    type: 'outro',
    description: 'Importância da biodiversidade da Floresta Amazônica',
    isActive: true,
    usageCount: 9,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'theme-10',
    name: 'Sistema Solar',
    type: 'outro',
    description: 'Características e composição do Sistema Solar',
    isActive: true,
    usageCount: 4,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'theme-11',
    name: 'Tema Desativado - Exemplo',
    type: 'ENEM',
    description: 'Tema desativado para testes',
    isActive: false,
    usageCount: 0,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
];

export const themesByType = {
  ENEM: essayThemes.filter(t => t.type === 'ENEM' && t.isActive),
  PAS: essayThemes.filter(t => t.type === 'PAS' && t.isActive),
  outro: essayThemes.filter(t => t.type === 'outro' && t.isActive),
};

export const activeThemes = essayThemes.filter(t => t.isActive);
export const inactiveThemes = essayThemes.filter(t => !t.isActive);

export const themesByUsage = {
  high: essayThemes.filter(t => t.usageCount >= 15),
  medium: essayThemes.filter(t => t.usageCount >= 5 && t.usageCount < 15),
  low: essayThemes.filter(t => t.usageCount < 5),
};

export default essayThemes;
