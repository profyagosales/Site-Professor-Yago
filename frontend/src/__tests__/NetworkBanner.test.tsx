/**
 * Testes para o componente NetworkBanner
 * 
 * Cobre:
 * - Exibição quando offline/backend indisponível
 * - Ocultação quando online/backend saudável
 * - Botões de retry e dismiss
 * - Diferenciação entre problemas de rede e backend
 * - Toasts de notificação
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NetworkBanner from '@/components/NetworkBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBackendHealth } from '@/services/health';
import { useToast } from '@/hooks/useToast';

// Mock dos hooks
jest.mock('@/hooks/useNetworkStatus');
jest.mock('@/services/health');
jest.mock('@/hooks/useToast');

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockUseBackendHealth = useBackendHealth as jest.MockedFunction<typeof useBackendHealth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('NetworkBanner', () => {
  const mockRetryConnection = jest.fn();
  const mockRetryBackend = jest.fn();
  const mockToast = {
    warning: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseToast.mockReturnValue(mockToast);
  });

  describe('Quando online e backend saudável', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });
    });

    it('não deve renderizar o banner', () => {
      render(<NetworkBanner />);
      
      expect(screen.queryByText(/sem conexão|serviço temporariamente indisponível/i)).not.toBeInTheDocument();
    });
  });

  describe('Quando offline (sem internet)', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });
    });

    it('deve renderizar banner de sem conexão', () => {
      render(<NetworkBanner />);
      
      expect(screen.getByText('Sem conexão com a internet')).toBeInTheDocument();
      expect(screen.getByText('Verifique sua conexão e tente novamente')).toBeInTheDocument();
    });

    it('deve mostrar toast de aviso', () => {
      render(<NetworkBanner />);
      
      expect(mockToast.warning).toHaveBeenCalledWith('Conexão perdida. Verificando...');
    });

    it('deve permitir retry de conexão', async () => {
      mockRetryConnection.mockResolvedValue(true);
      
      render(<NetworkBanner />);
      
      const retryButton = screen.getByText('Tentar Novamente');
      fireEvent.click(retryButton);
      
      expect(mockRetryConnection).toHaveBeenCalled();
    });

    it('deve mostrar toast de sucesso quando conexão é restaurada', () => {
      // Simular transição de offline para online
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 1, // Tinha tentativas anteriores
        retryConnection: mockRetryConnection,
      });

      render(<NetworkBanner />);
      
      expect(mockToast.success).toHaveBeenCalledWith('Conexão restaurada!');
    });

    it('deve mostrar contador de tentativas', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 2,
        retryConnection: mockRetryConnection,
      });

      render(<NetworkBanner />);
      
      expect(screen.getByText(/Tentativa 2/)).toBeInTheDocument();
    });
  });

  describe('Quando backend indisponível (com internet)', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 1,
        retry: mockRetryBackend,
      });
    });

    it('deve renderizar banner de serviço indisponível', () => {
      render(<NetworkBanner />);
      
      expect(screen.getByText('Serviço temporariamente indisponível')).toBeInTheDocument();
      expect(screen.getByText('Algumas ações podem falhar')).toBeInTheDocument();
    });

    it('deve mostrar toast de aviso', () => {
      render(<NetworkBanner />);
      
      expect(mockToast.warning).toHaveBeenCalledWith('Serviço temporariamente indisponível. Algumas ações podem falhar.');
    });

    it('deve permitir retry do backend', async () => {
      mockRetryBackend.mockResolvedValue(true);
      
      render(<NetworkBanner />);
      
      const retryButton = screen.getByText('Tentar Novamente');
      fireEvent.click(retryButton);
      
      expect(mockRetryBackend).toHaveBeenCalled();
    });

    it('deve mostrar contador de tentativas do backend', () => {
      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 3,
        retry: mockRetryBackend,
      });

      render(<NetworkBanner />);
      
      expect(screen.getByText(/Tentativa 3/)).toBeInTheDocument();
    });
  });

  describe('Quando ambos offline e backend indisponível', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 2,
        retry: mockRetryBackend,
      });
    });

    it('deve priorizar problema de rede', () => {
      render(<NetworkBanner />);
      
      expect(screen.getByText('Sem conexão com a internet')).toBeInTheDocument();
      expect(screen.queryByText('Serviço temporariamente indisponível')).not.toBeInTheDocument();
    });

    it('deve somar contadores de tentativas', () => {
      render(<NetworkBanner />);
      
      expect(screen.getByText(/Tentativa 3/)).toBeInTheDocument(); // 1 + 2
    });
  });

  describe('Botão de dismiss', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });
    });

    it('deve ocultar banner quando clicado', () => {
      render(<NetworkBanner />);
      
      expect(screen.getByText('Sem conexão com a internet')).toBeInTheDocument();
      
      const dismissButton = screen.getByLabelText('Fechar banner');
      fireEvent.click(dismissButton);
      
      expect(screen.queryByText('Sem conexão com a internet')).not.toBeInTheDocument();
    });
  });

  describe('Estados de loading', () => {
    it('deve mostrar indicador de verificação quando backend está checando', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: true,
        retryCount: 1,
        retry: mockRetryBackend,
      });

      render(<NetworkBanner />);
      
      const indicator = screen.getByRole('generic', { hidden: true }); // div com classe animate-pulse
      expect(indicator).toHaveClass('animate-pulse');
    });

    it('deve desabilitar botão de retry quando está checando', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: true,
        retryCount: 0,
        retry: mockRetryBackend,
      });

      render(<NetworkBanner />);
      
      const retryButton = screen.getByText('Verificando...');
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Limite de tentativas', () => {
    it('deve desabilitar retry após 3 tentativas', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 3,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });

      render(<NetworkBanner />);
      
      const retryButton = screen.getByText('Máx. tentativas');
      expect(retryButton).toBeDisabled();
    });

    it('deve mostrar toast de erro após máximo de tentativas', async () => {
      mockRetryConnection.mockResolvedValue(false);
      
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 2,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });

      render(<NetworkBanner />);
      
      const retryButton = screen.getByText('Tentar Novamente');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Não foi possível restaurar a conexão');
      });
    });
  });

  describe('Acessibilidade', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });
    });

    it('deve ter botão de dismiss com aria-label', () => {
      render(<NetworkBanner />);
      
      const dismissButton = screen.getByLabelText('Fechar banner');
      expect(dismissButton).toBeInTheDocument();
    });

    it('deve ter estrutura semântica correta', () => {
      render(<NetworkBanner />);
      
      // Banner deve ter role de alert ou banner
      const banner = screen.getByRole('generic'); // div principal
      expect(banner).toBeInTheDocument();
    });
  });
});


 * Testes para o componente NetworkBanner
 * 
 * Cobre:
 * - Exibição quando offline/backend indisponível
 * - Ocultação quando online/backend saudável
 * - Botões de retry e dismiss
 * - Diferenciação entre problemas de rede e backend
 * - Toasts de notificação
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NetworkBanner from '@/components/NetworkBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBackendHealth } from '@/services/health';
import { useToast } from '@/hooks/useToast';

// Mock dos hooks
jest.mock('@/hooks/useNetworkStatus');
jest.mock('@/services/health');
jest.mock('@/hooks/useToast');

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockUseBackendHealth = useBackendHealth as jest.MockedFunction<typeof useBackendHealth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('NetworkBanner', () => {
  const mockRetryConnection = jest.fn();
  const mockRetryBackend = jest.fn();
  const mockToast = {
    warning: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseToast.mockReturnValue(mockToast);
  });

  describe('Quando online e backend saudável', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });
    });

    it('não deve renderizar o banner', () => {
      render(<NetworkBanner />);
      
      expect(screen.queryByText(/sem conexão|serviço temporariamente indisponível/i)).not.toBeInTheDocument();
    });
  });

  describe('Quando offline (sem internet)', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });
    });

    it('deve renderizar banner de sem conexão', () => {
      render(<NetworkBanner />);
      
      expect(screen.getByText('Sem conexão com a internet')).toBeInTheDocument();
      expect(screen.getByText('Verifique sua conexão e tente novamente')).toBeInTheDocument();
    });

    it('deve mostrar toast de aviso', () => {
      render(<NetworkBanner />);
      
      expect(mockToast.warning).toHaveBeenCalledWith('Conexão perdida. Verificando...');
    });

    it('deve permitir retry de conexão', async () => {
      mockRetryConnection.mockResolvedValue(true);
      
      render(<NetworkBanner />);
      
      const retryButton = screen.getByText('Tentar Novamente');
      fireEvent.click(retryButton);
      
      expect(mockRetryConnection).toHaveBeenCalled();
    });

    it('deve mostrar toast de sucesso quando conexão é restaurada', () => {
      // Simular transição de offline para online
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 1, // Tinha tentativas anteriores
        retryConnection: mockRetryConnection,
      });

      render(<NetworkBanner />);
      
      expect(mockToast.success).toHaveBeenCalledWith('Conexão restaurada!');
    });

    it('deve mostrar contador de tentativas', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 2,
        retryConnection: mockRetryConnection,
      });

      render(<NetworkBanner />);
      
      expect(screen.getByText(/Tentativa 2/)).toBeInTheDocument();
    });
  });

  describe('Quando backend indisponível (com internet)', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 1,
        retry: mockRetryBackend,
      });
    });

    it('deve renderizar banner de serviço indisponível', () => {
      render(<NetworkBanner />);
      
      expect(screen.getByText('Serviço temporariamente indisponível')).toBeInTheDocument();
      expect(screen.getByText('Algumas ações podem falhar')).toBeInTheDocument();
    });

    it('deve mostrar toast de aviso', () => {
      render(<NetworkBanner />);
      
      expect(mockToast.warning).toHaveBeenCalledWith('Serviço temporariamente indisponível. Algumas ações podem falhar.');
    });

    it('deve permitir retry do backend', async () => {
      mockRetryBackend.mockResolvedValue(true);
      
      render(<NetworkBanner />);
      
      const retryButton = screen.getByText('Tentar Novamente');
      fireEvent.click(retryButton);
      
      expect(mockRetryBackend).toHaveBeenCalled();
    });

    it('deve mostrar contador de tentativas do backend', () => {
      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 3,
        retry: mockRetryBackend,
      });

      render(<NetworkBanner />);
      
      expect(screen.getByText(/Tentativa 3/)).toBeInTheDocument();
    });
  });

  describe('Quando ambos offline e backend indisponível', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: false,
        retryCount: 2,
        retry: mockRetryBackend,
      });
    });

    it('deve priorizar problema de rede', () => {
      render(<NetworkBanner />);
      
      expect(screen.getByText('Sem conexão com a internet')).toBeInTheDocument();
      expect(screen.queryByText('Serviço temporariamente indisponível')).not.toBeInTheDocument();
    });

    it('deve somar contadores de tentativas', () => {
      render(<NetworkBanner />);
      
      expect(screen.getByText(/Tentativa 3/)).toBeInTheDocument(); // 1 + 2
    });
  });

  describe('Botão de dismiss', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });
    });

    it('deve ocultar banner quando clicado', () => {
      render(<NetworkBanner />);
      
      expect(screen.getByText('Sem conexão com a internet')).toBeInTheDocument();
      
      const dismissButton = screen.getByLabelText('Fechar banner');
      fireEvent.click(dismissButton);
      
      expect(screen.queryByText('Sem conexão com a internet')).not.toBeInTheDocument();
    });
  });

  describe('Estados de loading', () => {
    it('deve mostrar indicador de verificação quando backend está checando', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi',
        retryCount: 0,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: false,
        isChecking: true,
        retryCount: 1,
        retry: mockRetryBackend,
      });

      render(<NetworkBanner />);
      
      const indicator = screen.getByRole('generic', { hidden: true }); // div com classe animate-pulse
      expect(indicator).toHaveClass('animate-pulse');
    });

    it('deve desabilitar botão de retry quando está checando', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: true,
        retryCount: 0,
        retry: mockRetryBackend,
      });

      render(<NetworkBanner />);
      
      const retryButton = screen.getByText('Verificando...');
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Limite de tentativas', () => {
    it('deve desabilitar retry após 3 tentativas', () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 3,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });

      render(<NetworkBanner />);
      
      const retryButton = screen.getByText('Máx. tentativas');
      expect(retryButton).toBeDisabled();
    });

    it('deve mostrar toast de erro após máximo de tentativas', async () => {
      mockRetryConnection.mockResolvedValue(false);
      
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 2,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });

      render(<NetworkBanner />);
      
      const retryButton = screen.getByText('Tentar Novamente');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Não foi possível restaurar a conexão');
      });
    });
  });

  describe('Acessibilidade', () => {
    beforeEach(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        connectionType: 'none',
        retryCount: 1,
        retryConnection: mockRetryConnection,
      });

      mockUseBackendHealth.mockReturnValue({
        isHealthy: true,
        isChecking: false,
        retryCount: 0,
        retry: mockRetryBackend,
      });
    });

    it('deve ter botão de dismiss com aria-label', () => {
      render(<NetworkBanner />);
      
      const dismissButton = screen.getByLabelText('Fechar banner');
      expect(dismissButton).toBeInTheDocument();
    });

    it('deve ter estrutura semântica correta', () => {
      render(<NetworkBanner />);
      
      // Banner deve ter role de alert ou banner
      const banner = screen.getByRole('generic'); // div principal
      expect(banner).toBeInTheDocument();
    });
  });
});


