import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import { ROUTES } from '@/routes';

// Mock do useLocation
const mockUseLocation = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockUseLocation(),
}));

describe('NotFound Page', () => {
  beforeEach(() => {
    mockUseLocation.mockReturnValue({
      pathname: '/invalid-route',
      search: '',
      hash: '',
      state: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar mensagem de erro com pathname atual', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );

    expect(screen.getByText('Página não encontrada')).toBeInTheDocument();
    expect(screen.getByText('/invalid-route')).toBeInTheDocument();
  });

  it('deve renderizar ícone de erro', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );

    const errorIcon = screen.getByTestId('error-icon');
    expect(errorIcon).toBeInTheDocument();
    expect(errorIcon.closest('div')).toHaveClass('bg-red-50', 'text-red-600');
  });

  it('deve renderizar botões de navegação principais', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );

    expect(screen.getByText('🏠 Página inicial')).toBeInTheDocument();
    expect(screen.getByText('👨‍🎓 Login do Aluno')).toBeInTheDocument();
    expect(screen.getByText('👨‍🏫 Login do Professor')).toBeInTheDocument();
  });

  it('deve ter links corretos para os botões principais', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );

    const homeLink = screen.getByText('🏠 Página inicial').closest('a');
    const alunoLink = screen.getByText('👨‍🎓 Login do Aluno').closest('a');
    const profLink = screen.getByText('👨‍🏫 Login do Professor').closest('a');

    expect(homeLink).toHaveAttribute('href', ROUTES.home);
    expect(alunoLink).toHaveAttribute('href', ROUTES.aluno.login);
    expect(profLink).toHaveAttribute('href', ROUTES.auth.loginProf);
  });

  it('deve renderizar links úteis adicionais', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );

    expect(screen.getByText('Ou acesse diretamente:')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Professor')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Aluno')).toBeInTheDocument();
    expect(screen.getByText('Turmas')).toBeInTheDocument();
    expect(screen.getByText('Redações')).toBeInTheDocument();
  });

  it('deve ter links corretos para as rotas úteis', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );

    const profDashboardLink = screen
      .getByText('Dashboard Professor')
      .closest('a');
    const alunoDashboardLink = screen.getByText('Dashboard Aluno').closest('a');
    const turmasLink = screen.getByText('Turmas').closest('a');
    const redacoesLink = screen.getByText('Redações').closest('a');

    expect(profDashboardLink).toHaveAttribute('href', ROUTES.prof.resumo);
    expect(alunoDashboardLink).toHaveAttribute('href', ROUTES.aluno.resumo);
    expect(turmasLink).toHaveAttribute('href', ROUTES.prof.turmas);
    expect(redacoesLink).toHaveAttribute('href', ROUTES.prof.redacao);
  });

  it('deve mostrar pathname diferente quando mudado', () => {
    mockUseLocation.mockReturnValue({
      pathname: '/another-invalid-route',
      search: '',
      hash: '',
      state: null,
    });

    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );

    expect(screen.getByText('/another-invalid-route')).toBeInTheDocument();
  });

  it('deve funcionar com MemoryRouter', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText('Página não encontrada')).toBeInTheDocument();
    expect(screen.getByText('🏠 Página inicial')).toBeInTheDocument();
  });

  it('deve ter classes CSS corretas para responsividade', () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );

    const buttonContainer = screen
      .getByText('🏠 Página inicial')
      .closest('div');
    expect(buttonContainer).toHaveClass('flex-col', 'sm:flex-row');

    const linksContainer = screen
      .getByText('Dashboard Professor')
      .closest('div');
    expect(linksContainer).toHaveClass('flex-wrap', 'gap-2', 'justify-center');
  });
});
