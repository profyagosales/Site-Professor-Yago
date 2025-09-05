import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FlagsDebug, useFlagsDebug } from '@/components/FlagsDebug';

// Mock das funções de flags para evitar problemas com import.meta
jest.mock('@/flags', () => ({
  getFlag: jest.fn(),
  setFlag: jest.fn(),
  resetFlags: jest.fn(),
  getAllFlags: () => ({
    pdf_inline_viewer: true,
    annotations_enabled: true,
    new_menu_styles: true,
  }),
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Sistema de Feature Flags', () => {
  describe('FlagsDebug Component', () => {
    it('deve renderizar quando isOpen é true', () => {
      render(
        <BrowserRouter>
          <FlagsDebug isOpen={true} onClose={jest.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByText('Feature Flags')).toBeInTheDocument();
      expect(screen.getByText('PDF Inline Viewer')).toBeInTheDocument();
      expect(screen.getByText('Anotações')).toBeInTheDocument();
      expect(screen.getByText('Novos Estilos de Menu')).toBeInTheDocument();
    });

    it('não deve renderizar quando isOpen é false', () => {
      render(
        <BrowserRouter>
          <FlagsDebug isOpen={false} onClose={jest.fn()} />
        </BrowserRouter>
      );

      expect(screen.queryByText('Feature Flags')).not.toBeInTheDocument();
    });

    it('deve chamar onClose quando botão fechar é clicado', () => {
      const onClose = jest.fn();
      render(
        <BrowserRouter>
          <FlagsDebug isOpen={true} onClose={onClose} />
        </BrowserRouter>
      );

      const closeButton = screen.getByLabelText('Fechar painel de flags');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('deve ter toggles funcionais', () => {
      render(
        <BrowserRouter>
          <FlagsDebug isOpen={true} onClose={jest.fn()} />
        </BrowserRouter>
      );

      const toggles = screen.getAllByRole('checkbox');
      expect(toggles).toHaveLength(3); // PDF, Anotações, Menu Styles

      // Verifica se os toggles são clicáveis
      toggles.forEach(toggle => {
        fireEvent.click(toggle);
        expect(toggle).toBeInTheDocument();
      });
    });

    it('deve ter botões de ação', () => {
      render(
        <BrowserRouter>
          <FlagsDebug isOpen={true} onClose={jest.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByText('Resetar Padrões')).toBeInTheDocument();
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });
  });

  describe('useFlagsDebug Hook', () => {
    it('deve retornar estado inicial correto', () => {
      const TestComponent = () => {
        const { isOpen, open, close, toggle } = useFlagsDebug();
        return (
          <div>
            <span data-testid='isOpen'>{isOpen.toString()}</span>
            <button onClick={open}>Open</button>
            <button onClick={close}>Close</button>
            <button onClick={toggle}>Toggle</button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    });

    it('deve abrir quando open é chamado', () => {
      const TestComponent = () => {
        const { isOpen, open } = useFlagsDebug();
        return (
          <div>
            <span data-testid='isOpen'>{isOpen.toString()}</span>
            <button onClick={open}>Open</button>
          </div>
        );
      };

      render(<TestComponent />);

      const openButton = screen.getByText('Open');
      fireEvent.click(openButton);

      expect(screen.getByTestId('isOpen')).toHaveTextContent('true');
    });

    it('deve fechar quando close é chamado', () => {
      const TestComponent = () => {
        const { isOpen, open, close } = useFlagsDebug();
        return (
          <div>
            <span data-testid='isOpen'>{isOpen.toString()}</span>
            <button onClick={open}>Open</button>
            <button onClick={close}>Close</button>
          </div>
        );
      };

      render(<TestComponent />);

      const openButton = screen.getByText('Open');
      const closeButton = screen.getByText('Close');

      fireEvent.click(openButton);
      expect(screen.getByTestId('isOpen')).toHaveTextContent('true');

      fireEvent.click(closeButton);
      expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    });

    it('deve alternar quando toggle é chamado', () => {
      const TestComponent = () => {
        const { isOpen, toggle } = useFlagsDebug();
        return (
          <div>
            <span data-testid='isOpen'>{isOpen.toString()}</span>
            <button onClick={toggle}>Toggle</button>
          </div>
        );
      };

      render(<TestComponent />);

      const toggleButton = screen.getByText('Toggle');

      fireEvent.click(toggleButton);
      expect(screen.getByTestId('isOpen')).toHaveTextContent('true');

      fireEvent.click(toggleButton);
      expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    });
  });
});

import { BrowserRouter } from 'react-router-dom';
import { FlagsDebug, useFlagsDebug } from '@/components/FlagsDebug';

// Mock das funções de flags para evitar problemas com import.meta
jest.mock('@/flags', () => ({
  getFlag: jest.fn(),
  setFlag: jest.fn(),
  resetFlags: jest.fn(),
  getAllFlags: () => ({
    pdf_inline_viewer: true,
    annotations_enabled: true,
    new_menu_styles: true,
  }),
}));

// Mock do logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Sistema de Feature Flags', () => {
  describe('FlagsDebug Component', () => {
    it('deve renderizar quando isOpen é true', () => {
      render(
        <BrowserRouter>
          <FlagsDebug isOpen={true} onClose={jest.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByText('Feature Flags')).toBeInTheDocument();
      expect(screen.getByText('PDF Inline Viewer')).toBeInTheDocument();
      expect(screen.getByText('Anotações')).toBeInTheDocument();
      expect(screen.getByText('Novos Estilos de Menu')).toBeInTheDocument();
    });

    it('não deve renderizar quando isOpen é false', () => {
      render(
        <BrowserRouter>
          <FlagsDebug isOpen={false} onClose={jest.fn()} />
        </BrowserRouter>
      );

      expect(screen.queryByText('Feature Flags')).not.toBeInTheDocument();
    });

    it('deve chamar onClose quando botão fechar é clicado', () => {
      const onClose = jest.fn();
      render(
        <BrowserRouter>
          <FlagsDebug isOpen={true} onClose={onClose} />
        </BrowserRouter>
      );

      const closeButton = screen.getByLabelText('Fechar painel de flags');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('deve ter toggles funcionais', () => {
      render(
        <BrowserRouter>
          <FlagsDebug isOpen={true} onClose={jest.fn()} />
        </BrowserRouter>
      );

      const toggles = screen.getAllByRole('checkbox');
      expect(toggles).toHaveLength(3); // PDF, Anotações, Menu Styles

      // Verifica se os toggles são clicáveis
      toggles.forEach(toggle => {
        fireEvent.click(toggle);
        expect(toggle).toBeInTheDocument();
      });
    });

    it('deve ter botões de ação', () => {
      render(
        <BrowserRouter>
          <FlagsDebug isOpen={true} onClose={jest.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByText('Resetar Padrões')).toBeInTheDocument();
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });
  });

  describe('useFlagsDebug Hook', () => {
    it('deve retornar estado inicial correto', () => {
      const TestComponent = () => {
        const { isOpen, open, close, toggle } = useFlagsDebug();
        return (
          <div>
            <span data-testid='isOpen'>{isOpen.toString()}</span>
            <button onClick={open}>Open</button>
            <button onClick={close}>Close</button>
            <button onClick={toggle}>Toggle</button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    });

    it('deve abrir quando open é chamado', () => {
      const TestComponent = () => {
        const { isOpen, open } = useFlagsDebug();
        return (
          <div>
            <span data-testid='isOpen'>{isOpen.toString()}</span>
            <button onClick={open}>Open</button>
          </div>
        );
      };

      render(<TestComponent />);

      const openButton = screen.getByText('Open');
      fireEvent.click(openButton);

      expect(screen.getByTestId('isOpen')).toHaveTextContent('true');
    });

    it('deve fechar quando close é chamado', () => {
      const TestComponent = () => {
        const { isOpen, open, close } = useFlagsDebug();
        return (
          <div>
            <span data-testid='isOpen'>{isOpen.toString()}</span>
            <button onClick={open}>Open</button>
            <button onClick={close}>Close</button>
          </div>
        );
      };

      render(<TestComponent />);

      const openButton = screen.getByText('Open');
      const closeButton = screen.getByText('Close');

      fireEvent.click(openButton);
      expect(screen.getByTestId('isOpen')).toHaveTextContent('true');

      fireEvent.click(closeButton);
      expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    });

    it('deve alternar quando toggle é chamado', () => {
      const TestComponent = () => {
        const { isOpen, toggle } = useFlagsDebug();
        return (
          <div>
            <span data-testid='isOpen'>{isOpen.toString()}</span>
            <button onClick={toggle}>Toggle</button>
          </div>
        );
      };

      render(<TestComponent />);

      const toggleButton = screen.getByText('Toggle');

      fireEvent.click(toggleButton);
      expect(screen.getByTestId('isOpen')).toHaveTextContent('true');

      fireEvent.click(toggleButton);
      expect(screen.getByTestId('isOpen')).toHaveTextContent('false');
    });
  });
});
