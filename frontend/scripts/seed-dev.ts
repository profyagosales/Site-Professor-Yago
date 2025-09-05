#!/usr/bin/env node

/**
 * Script de seed para dados de desenvolvimento
 * 
 * Funcionalidades:
 * - Popula dados mínimos para desenvolvimento
 * - Chama endpoints de seed do backend ou usa dados estáticos
 * - Configura ambiente de desenvolvimento
 * - Valida dados antes de popular
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../src/lib/logger';

// Importa dados das fixtures
import { seedData } from '../src/__fixtures__';

interface SeedConfig {
  backendUrl: string;
  useBackendSeed: boolean;
  clearExisting: boolean;
  verbose: boolean;
}

interface SeedResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class DevSeeder {
  private config: SeedConfig;
  private backendUrl: string;

  constructor(config: SeedConfig) {
    this.config = config;
    this.backendUrl = config.backendUrl;
  }

  /**
   * Executa o seed completo
   */
  async seed(): Promise<SeedResult> {
    try {
      logger.info('🌱 Iniciando seed de dados de desenvolvimento...');

      if (this.config.useBackendSeed) {
        return await this.seedViaBackend();
      } else {
        return await this.seedViaStatic();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('❌ Erro durante seed:', { error: errorMessage });
      return {
        success: false,
        message: 'Falha no seed',
        error: errorMessage,
      };
    }
  }

  /**
   * Seed via endpoints do backend
   */
  private async seedViaBackend(): Promise<SeedResult> {
    try {
      logger.info('📡 Usando endpoints do backend para seed...');

      // Verifica se o backend está disponível
      const healthCheck = await this.checkBackendHealth();
      if (!healthCheck) {
        throw new Error('Backend não está disponível');
      }

      // Popula dados via API
      const results = await Promise.allSettled([
        this.seedStudents(),
        this.seedClasses(),
        this.seedEssayThemes(),
        this.seedEssays(),
        this.seedGrades(),
        this.seedDiary(),
      ]);

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const totalCount = results.length;

      if (successCount === totalCount) {
        logger.info('✅ Seed via backend concluído com sucesso!');
        return {
          success: true,
          message: `Seed concluído: ${successCount}/${totalCount} entidades populadas`,
        };
      } else {
        logger.warn(`⚠️ Seed parcial: ${successCount}/${totalCount} entidades populadas`);
        return {
          success: true,
          message: `Seed parcial: ${successCount}/${totalCount} entidades populadas`,
        };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Seed via dados estáticos (JSON)
   */
  private async seedViaStatic(): Promise<SeedResult> {
    try {
      logger.info('📄 Usando dados estáticos para seed...');

      // Cria arquivo de dados estáticos
      const staticDataPath = join(process.cwd(), 'src', 'data', 'dev-seed.json');
      const staticData = {
        ...seedData,
        metadata: {
          createdAt: new Date().toISOString(),
          version: '1.0.0',
          environment: 'development',
        },
      };

      // Cria diretório se não existir
      const dataDir = join(process.cwd(), 'src', 'data');
      if (!existsSync(dataDir)) {
        require('fs').mkdirSync(dataDir, { recursive: true });
      }

      // Salva dados estáticos
      writeFileSync(staticDataPath, JSON.stringify(staticData, null, 2));

      logger.info('✅ Dados estáticos salvos com sucesso!');
      return {
        success: true,
        message: 'Dados estáticos salvos em src/data/dev-seed.json',
        data: staticData,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verifica saúde do backend
   */
  private async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Popula estudantes
   */
  private async seedStudents(): Promise<void> {
    if (this.config.verbose) {
      logger.info('👥 Populando estudantes...');
    }

    const students = seedData.students;
    const response = await fetch(`${this.backendUrl}/api/students/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students, clearExisting: this.config.clearExisting }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao popular estudantes: ${response.statusText}`);
    }

    if (this.config.verbose) {
      logger.info(`✅ ${students.length} estudantes populados`);
    }
  }

  /**
   * Popula turmas
   */
  private async seedClasses(): Promise<void> {
    if (this.config.verbose) {
      logger.info('🏫 Populando turmas...');
    }

    const classes = seedData.classes;
    const response = await fetch(`${this.backendUrl}/api/classes/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classes, clearExisting: this.config.clearExisting }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao popular turmas: ${response.statusText}`);
    }

    if (this.config.verbose) {
      logger.info(`✅ ${classes.length} turmas populadas`);
    }
  }

  /**
   * Popula temas de redação
   */
  private async seedEssayThemes(): Promise<void> {
    if (this.config.verbose) {
      logger.info('📝 Populando temas de redação...');
    }

    const themes = seedData.essayThemes;
    const response = await fetch(`${this.backendUrl}/api/essay-themes/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themes, clearExisting: this.config.clearExisting }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao popular temas: ${response.statusText}`);
    }

    if (this.config.verbose) {
      logger.info(`✅ ${themes.length} temas populados`);
    }
  }

  /**
   * Popula redações
   */
  private async seedEssays(): Promise<void> {
    if (this.config.verbose) {
      logger.info('📄 Populando redações...');
    }

    const essays = seedData.essays;
    const response = await fetch(`${this.backendUrl}/api/essays/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ essays, clearExisting: this.config.clearExisting }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao popular redações: ${response.statusText}`);
    }

    if (this.config.verbose) {
      logger.info(`✅ ${essays.length} redações populadas`);
    }
  }

  /**
   * Popula notas
   */
  private async seedGrades(): Promise<void> {
    if (this.config.verbose) {
      logger.info('📊 Populando notas...');
    }

    const { assessments, grades } = seedData.grades;
    const response = await fetch(`${this.backendUrl}/api/grades/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        assessments, 
        grades, 
        clearExisting: this.config.clearExisting 
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao popular notas: ${response.statusText}`);
    }

    if (this.config.verbose) {
      logger.info(`✅ ${assessments.length} avaliações e ${grades.length} notas populadas`);
    }
  }

  /**
   * Popula diário
   */
  private async seedDiary(): Promise<void> {
    if (this.config.verbose) {
      logger.info('📅 Populando diário...');
    }

    const { diaryEntries } = seedData.diary;
    const response = await fetch(`${this.backendUrl}/api/diary/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        entries: diaryEntries, 
        clearExisting: this.config.clearExisting 
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao popular diário: ${response.statusText}`);
    }

    if (this.config.verbose) {
      logger.info(`✅ ${diaryEntries.length} entradas do diário populadas`);
    }
  }
}

/**
 * Função principal
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse argumentos
  const config: SeedConfig = {
    backendUrl: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
    useBackendSeed: args.includes('--backend'),
    clearExisting: args.includes('--clear'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  // Valida configuração
  if (!config.backendUrl) {
    logger.error('❌ VITE_API_BASE_URL não definido');
    process.exit(1);
  }

  // Cria seeder
  const seeder = new DevSeeder(config);

  // Executa seed
  const result = await seeder.seed();

  if (result.success) {
    logger.info(`🎉 ${result.message}`);
    process.exit(0);
  } else {
    logger.error(`❌ ${result.message}`);
    if (result.error) {
      logger.error(`   Erro: ${result.error}`);
    }
    process.exit(1);
  }
}

// Executa se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logger.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

export { DevSeeder, SeedConfig, SeedResult };
