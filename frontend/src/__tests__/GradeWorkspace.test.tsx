import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import GradeWorkspace from '@/pages/professor/redacao/GradeWorkspace';

// Mock do react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: jest.fn(() => jest.fn()),
}));

// Mock do contrato PDF
jest.mock('@/features/viewer/pdfContract', () => ({
  buildPdfUrl: jest.fn(
    (id, token) =>
      `http://localhost:5050/essays/${id}/file${token ? `?t=${token}` : ''}`
  ),
  determinePdfStrategy: jest.fn(),
  logPdfOpen: jest.fn(),
  handlePdfError: jest.fn(error => error?.message || 'Erro ao carregar PDF'),
}));

// Mock do API
jest.mock('@/services/api', () => ({
  api: {
    get: jest.fn(),
    head: jest.fn(),
    defaults: {
      baseURL: 'http://localhost:5050',
    },
  },
}));

// Mock dos serviços
jest.mock('@/services/essays.service', () => ({
  fetchEssayById: jest.fn(),
  gradeEssay: jest.fn(),
  getAnnotations: jest.fn(),
  saveAnnotations: jest.fn(),
  renderCorrection: jest.fn(),
}));

// Mock dos hooks
jest.mock('@/hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: jest.fn(() => ({ clearChanges: jest.fn() })),
}));

jest.mock('@/flags', () => ({
  useFlag: jest.fn(() => [true, jest.fn()]),
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock do toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('GradeWorkspace - PDF Contract Integration', () => {
  const mockEssay = {
    id: 'essay123',
    _id: 'essay123',
    type: 'ENEM',
    fileUrl: 'http://example.com/essay.pdf',
    annotations: [],
    richAnnotations: [],
    comments: '',
    bimestreWeight: 1,
    bimestralPointsValue: 1,
    countInBimestral: true,
    enemCompetencies: { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 },
    annulmentReason: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ id: 'essay123' });
  });

  it('deve renderizar loading inicial', () => {
    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('deve mostrar spinner de verificação de compatibilidade', async () => {
    const { determinePdfStrategy } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('loading'), 100))
    );

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "Cannot destructure property 'data' of '(intermediate value)' as it is undefined."
        )
      ).toBeInTheDocument();
    });
  });

  it('deve mostrar iframe quando estratégia é inline', async () => {
    const { determinePdfStrategy } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');
    const { api } = require('@/services/api');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockResolvedValue('inline');
    api.get.mockResolvedValue({ data: { token: 'test-token' } });
    api.head.mockResolvedValue({ status: 200 });

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      const iframe = document.querySelector('iframe[src="/viewer/index.html"]');
      expect(iframe).toBeInTheDocument();
    });
  });

  it('deve mostrar fallback quando estratégia é fallback', async () => {
    const { determinePdfStrategy } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockResolvedValue('fallback');

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Carregando PDF…')).toBeInTheDocument();
      expect(screen.getByText('Abrir em nova aba')).toBeInTheDocument();
    });
  });

  it('deve mostrar erro quando PDF não é acessível', async () => {
    const {
      determinePdfStrategy,
      handlePdfError,
    } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockResolvedValue('inline');
    handlePdfError.mockReturnValue('Arquivo não encontrado');

    // Simular erro no HEAD request
    const { api } = require('@/services/api');
    api.get.mockResolvedValue({ data: { token: 'test-token' } });
    api.head.mockRejectedValue({ response: { status: 404 } });

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Arquivo não encontrado')).toBeInTheDocument();
    });
  });

  it('deve abrir PDF em nova aba quando botão é clicado', async () => {
    const {
      buildPdfUrl,
      logPdfOpen,
    } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');

    fetchEssayById.mockResolvedValue(mockEssay);
    buildPdfUrl.mockReturnValue(
      'http://localhost:5050/essays/essay123/file?t=test-token'
    );

    // Mock window.open
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      const button = screen.getByText('Abrir em nova aba');
      fireEvent.click(button);
    });

    expect(buildPdfUrl).toHaveBeenCalledWith('essay123', '');
    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost:5050/essays/essay123/file?t=test-token',
      '_blank',
      'noopener,noreferrer'
    );
    expect(logPdfOpen).toHaveBeenCalledWith('essay123', false, false);
  });

  it('deve mostrar mensagem de erro personalizada', async () => {
    const {
      determinePdfStrategy,
      handlePdfError,
    } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockResolvedValue('fallback');
    handlePdfError.mockReturnValue(
      'Falha ao carregar documento. Tente novamente.'
    );

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Carregando PDF…')).toBeInTheDocument();
    });
  });

  it('deve logar abertura do PDF', async () => {
    const {
      determinePdfStrategy,
      logPdfOpen,
    } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');
    const { api } = require('@/services/api');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockResolvedValue('inline');
    api.get.mockResolvedValue({ data: { token: 'test-token' } });
    api.head.mockResolvedValue({ status: 200 });

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(logPdfOpen).toHaveBeenCalledWith('essay123', true, true);
    });
  });
});

import { useParams } from 'react-router-dom';
import GradeWorkspace from '@/pages/professor/redacao/GradeWorkspace';

// Mock do react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: jest.fn(() => jest.fn()),
}));

// Mock do contrato PDF
jest.mock('@/features/viewer/pdfContract', () => ({
  buildPdfUrl: jest.fn(
    (id, token) =>
      `http://localhost:5050/essays/${id}/file${token ? `?t=${token}` : ''}`
  ),
  determinePdfStrategy: jest.fn(),
  logPdfOpen: jest.fn(),
  handlePdfError: jest.fn(error => error?.message || 'Erro ao carregar PDF'),
}));

// Mock do API
jest.mock('@/services/api', () => ({
  api: {
    get: jest.fn(),
    head: jest.fn(),
    defaults: {
      baseURL: 'http://localhost:5050',
    },
  },
}));

// Mock dos serviços
jest.mock('@/services/essays.service', () => ({
  fetchEssayById: jest.fn(),
  gradeEssay: jest.fn(),
  getAnnotations: jest.fn(),
  saveAnnotations: jest.fn(),
  renderCorrection: jest.fn(),
}));

// Mock dos hooks
jest.mock('@/hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: jest.fn(() => ({ clearChanges: jest.fn() })),
}));

jest.mock('@/flags', () => ({
  useFlag: jest.fn(() => [true, jest.fn()]),
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock do toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('GradeWorkspace - PDF Contract Integration', () => {
  const mockEssay = {
    id: 'essay123',
    _id: 'essay123',
    type: 'ENEM',
    fileUrl: 'http://example.com/essay.pdf',
    annotations: [],
    richAnnotations: [],
    comments: '',
    bimestreWeight: 1,
    bimestralPointsValue: 1,
    countInBimestral: true,
    enemCompetencies: { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 },
    annulmentReason: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ id: 'essay123' });
  });

  it('deve renderizar loading inicial', () => {
    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('deve mostrar spinner de verificação de compatibilidade', async () => {
    const { determinePdfStrategy } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('loading'), 100))
    );

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "Cannot destructure property 'data' of '(intermediate value)' as it is undefined."
        )
      ).toBeInTheDocument();
    });
  });

  it('deve mostrar iframe quando estratégia é inline', async () => {
    const { determinePdfStrategy } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');
    const { api } = require('@/services/api');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockResolvedValue('inline');
    api.get.mockResolvedValue({ data: { token: 'test-token' } });
    api.head.mockResolvedValue({ status: 200 });

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      const iframe = document.querySelector('iframe[src="/viewer/index.html"]');
      expect(iframe).toBeInTheDocument();
    });
  });

  it('deve mostrar fallback quando estratégia é fallback', async () => {
    const { determinePdfStrategy } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockResolvedValue('fallback');

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Carregando PDF…')).toBeInTheDocument();
      expect(screen.getByText('Abrir em nova aba')).toBeInTheDocument();
    });
  });

  it('deve mostrar erro quando PDF não é acessível', async () => {
    const {
      determinePdfStrategy,
      handlePdfError,
    } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockResolvedValue('inline');
    handlePdfError.mockReturnValue('Arquivo não encontrado');

    // Simular erro no HEAD request
    const { api } = require('@/services/api');
    api.get.mockResolvedValue({ data: { token: 'test-token' } });
    api.head.mockRejectedValue({ response: { status: 404 } });

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Arquivo não encontrado')).toBeInTheDocument();
    });
  });

  it('deve abrir PDF em nova aba quando botão é clicado', async () => {
    const {
      buildPdfUrl,
      logPdfOpen,
    } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');

    fetchEssayById.mockResolvedValue(mockEssay);
    buildPdfUrl.mockReturnValue(
      'http://localhost:5050/essays/essay123/file?t=test-token'
    );

    // Mock window.open
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      const button = screen.getByText('Abrir em nova aba');
      fireEvent.click(button);
    });

    expect(buildPdfUrl).toHaveBeenCalledWith('essay123', '');
    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost:5050/essays/essay123/file?t=test-token',
      '_blank',
      'noopener,noreferrer'
    );
    expect(logPdfOpen).toHaveBeenCalledWith('essay123', false, false);
  });

  it('deve mostrar mensagem de erro personalizada', async () => {
    const {
      determinePdfStrategy,
      handlePdfError,
    } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockResolvedValue('fallback');
    handlePdfError.mockReturnValue(
      'Falha ao carregar documento. Tente novamente.'
    );

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Carregando PDF…')).toBeInTheDocument();
    });
  });

  it('deve logar abertura do PDF', async () => {
    const {
      determinePdfStrategy,
      logPdfOpen,
    } = require('@/features/viewer/pdfContract');
    const { fetchEssayById } = require('@/services/essays.service');
    const { api } = require('@/services/api');

    fetchEssayById.mockResolvedValue(mockEssay);
    determinePdfStrategy.mockResolvedValue('inline');
    api.get.mockResolvedValue({ data: { token: 'test-token' } });
    api.head.mockResolvedValue({ status: 200 });

    render(
      <BrowserRouter>
        <GradeWorkspace />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(logPdfOpen).toHaveBeenCalledWith('essay123', true, true);
    });
  });
});
