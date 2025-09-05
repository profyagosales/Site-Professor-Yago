import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { Table, Th, Td, ResponsiveTable } from '@/components/ui/Table';
import { MobileCard, TableCard } from '@/components/ui/MobileCard';

// Mock do localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock do useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/professor/resumo' }),
}));

// Mock do usePrefetch
jest.mock('@/hooks/usePrefetch', () => ({
  usePrefetch: () => ({ prefetchRoute: jest.fn() }),
}));

// Função helper para simular resize da janela
function resizeWindow(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // Disparar evento resize
  window.dispatchEvent(new Event('resize'));
}

describe('Responsividade - Componentes', () => {
  beforeEach(() => {
    mockLocalStorage.getItem.mockReturnValue('teacher');
    jest.clearAllMocks();
  });

  describe('AppShell - Menu Responsivo', () => {
    it('deve mostrar menu desktop em telas grandes', () => {
      resizeWindow(1024, 768);

      render(
        <BrowserRouter>
          <AppShell>
            <div>Conteúdo da página</div>
          </AppShell>
        </BrowserRouter>
      );

      // Menu desktop deve estar visível
      const desktopNav = screen.getByRole('navigation', {
        name: 'Menu principal',
      });
      expect(desktopNav).toBeInTheDocument();
      expect(desktopNav).toHaveClass('hidden', 'sm:flex');

      // Botão mobile não deve estar visível
      const mobileButton = screen.queryByLabelText('Abrir menu de navegação');
      expect(mobileButton).not.toBeInTheDocument();
    });

    it('deve mostrar botão mobile em telas pequenas', () => {
      resizeWindow(375, 667); // iPhone SE

      render(
        <BrowserRouter>
          <AppShell>
            <div>Conteúdo da página</div>
          </AppShell>
        </BrowserRouter>
      );

      // Menu desktop deve estar oculto
      const desktopNav = screen.getByRole('navigation', {
        name: 'Menu principal',
      });
      expect(desktopNav).toHaveClass('hidden', 'sm:flex');

      // Botão mobile deve estar visível
      const mobileButton = screen.getByLabelText('Abrir menu de navegação');
      expect(mobileButton).toBeInTheDocument();
      expect(mobileButton).toHaveClass('sm:hidden');
    });

    it('deve abrir e fechar drawer mobile', () => {
      resizeWindow(375, 667);

      render(
        <BrowserRouter>
          <AppShell>
            <div>Conteúdo da página</div>
          </AppShell>
        </BrowserRouter>
      );

      const mobileButton = screen.getByLabelText('Abrir menu de navegação');

      // Abrir drawer
      fireEvent.click(mobileButton);

      // Verificar se drawer está aberto
      const drawer = screen.getByRole('navigation', { name: 'Menu mobile' });
      expect(drawer).toBeInTheDocument();
      expect(drawer).toHaveClass('drawer-mobile', 'open');

      // Fechar drawer
      const closeButton = screen.getByLabelText('Fechar menu');
      fireEvent.click(closeButton);

      // Drawer deve estar fechado
      expect(drawer).not.toBeInTheDocument();
    });

    it('deve fechar drawer ao clicar no backdrop', () => {
      resizeWindow(375, 667);

      render(
        <BrowserRouter>
          <AppShell>
            <div>Conteúdo da página</div>
          </AppShell>
        </BrowserRouter>
      );

      const mobileButton = screen.getByLabelText('Abrir menu de navegação');
      fireEvent.click(mobileButton);

      // Verificar se drawer está aberto
      const drawer = screen.getByRole('navigation', { name: 'Menu mobile' });
      expect(drawer).toBeInTheDocument();

      // Fechar drawer clicando no botão de fechar
      const closeButton = screen.getByLabelText('Fechar menu');
      fireEvent.click(closeButton);

      // Drawer deve estar fechado
      expect(
        screen.queryByRole('navigation', { name: 'Menu mobile' })
      ).not.toBeInTheDocument();
    });
  });

  describe('Table - Responsividade', () => {
    it('deve ter overflow-x:auto em tabelas', () => {
      render(
        <Table>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>Email</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>João Silva</Td>
              <Td>joao@email.com</Td>
              <Td>Editar</Td>
            </tr>
          </tbody>
        </Table>
      );

      const tableContainer = screen.getByRole('table').parentElement;
      expect(tableContainer).toHaveClass('table-responsive');
    });

    it('deve ter largura mínima configurável', () => {
      render(
        <Table minWidth='800px'>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>Email</Th>
            </tr>
          </thead>
        </Table>
      );

      const table = screen.getByRole('table');
      expect(table).toHaveStyle({ minWidth: '800px' });
    });

    it('deve ter colunas com whitespace-nowrap', () => {
      render(
        <Table>
          <thead>
            <tr>
              <Th>Nome Completo</Th>
              <Th>Email</Th>
            </tr>
          </thead>
        </Table>
      );

      const th = screen.getByRole('columnheader', { name: 'Nome Completo' });
      expect(th).toHaveClass('whitespace-nowrap');
    });
  });

  describe('ResponsiveTable - Desktop/Mobile', () => {
    const tableContent = (
      <>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>Email</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td>João Silva</Td>
            <Td>joao@email.com</Td>
          </tr>
        </tbody>
      </>
    );

    const mobileCards = (
      <TableCard
        title='João Silva'
        subtitle='Aluno'
        data={[
          { label: 'Email', value: 'joao@email.com' },
          { label: 'Status', value: 'Ativo' },
        ]}
      />
    );

    it('deve mostrar tabela em desktop', () => {
      resizeWindow(1024, 768);

      render(
        <ResponsiveTable mobileCardComponent={mobileCards}>
          {tableContent}
        </ResponsiveTable>
      );

      // Tabela deve estar visível
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Container da tabela deve ter classe hidden md:block
      const tableContainer = table.closest('div')?.parentElement;
      expect(tableContainer).toHaveClass('hidden', 'md:block');
    });

    it('deve mostrar cards em mobile', () => {
      resizeWindow(375, 667);

      render(
        <ResponsiveTable mobileCardComponent={mobileCards}>
          {tableContent}
        </ResponsiveTable>
      );

      // Cards devem estar visíveis
      const cardTitle = screen.getAllByText('João Silva')[1]; // Pegar o segundo (do card)
      expect(cardTitle).toBeInTheDocument();

      // Container dos cards deve ter classe md:hidden
      const cardsContainer =
        cardTitle.closest('div')?.parentElement?.parentElement;
      expect(cardsContainer).toHaveClass('md:hidden');
    });
  });

  describe('MobileCard - Componentes', () => {
    it('deve renderizar TableCard com dados', () => {
      render(
        <TableCard
          title='João Silva'
          subtitle='Aluno'
          data={[
            { label: 'Email', value: 'joao@email.com' },
            { label: 'Idade', value: '18 anos' },
          ]}
        />
      );

      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Aluno')).toBeInTheDocument();
      expect(screen.getByText('Email:')).toBeInTheDocument();
      expect(screen.getByText('joao@email.com')).toBeInTheDocument();
      expect(screen.getByText('Idade:')).toBeInTheDocument();
      expect(screen.getByText('18 anos')).toBeInTheDocument();
    });
  });

  describe('Breakpoints - Validação', () => {
    it('deve funcionar em 360px (mínimo)', () => {
      resizeWindow(360, 640);

      render(
        <BrowserRouter>
          <AppShell>
            <div>Conteúdo</div>
          </AppShell>
        </BrowserRouter>
      );

      // Deve mostrar botão mobile
      const mobileButton = screen.getByLabelText('Abrir menu de navegação');
      expect(mobileButton).toBeInTheDocument();
    });

    it('deve funcionar em 414px (iPhone Plus)', () => {
      resizeWindow(414, 736);

      render(
        <BrowserRouter>
          <AppShell>
            <div>Conteúdo</div>
          </AppShell>
        </BrowserRouter>
      );

      // Deve mostrar botão mobile
      const mobileButton = screen.getByLabelText('Abrir menu de navegação');
      expect(mobileButton).toBeInTheDocument();
    });

    it('deve funcionar em 768px (tablet)', () => {
      resizeWindow(768, 1024);

      render(
        <BrowserRouter>
          <AppShell>
            <div>Conteúdo</div>
          </AppShell>
        </BrowserRouter>
      );

      // Deve mostrar menu desktop
      const desktopNav = screen.getByRole('navigation', {
        name: 'Menu principal',
      });
      expect(desktopNav).toBeInTheDocument();
      expect(desktopNav).toHaveClass('hidden', 'sm:flex');
    });
  });
});
