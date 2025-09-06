import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import AuthShell from '@/components/auth/AuthShell';
import { Field } from '@/components/ui/field.tsx';
import { Button } from '@/components/ui/button.tsx';
import AppShell from '@/components/AppShell';

// Configurar jest-axe
expect.extend(toHaveNoViolations);

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

// Mock do useBackNavigation
jest.mock('@/hooks/useBackNavigation', () => ({
  useBackNavigation: () => ({ handleBack: jest.fn() }),
}));

describe('Acessibilidade - Componentes Críticos', () => {
  beforeEach(() => {
    mockLocalStorage.getItem.mockReturnValue('teacher');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthShell', () => {
    it('deve ter estrutura semântica correta', async () => {
      const { container } = render(
        <BrowserRouter>
          <AuthShell
            roleLabel='Professor'
            heading='Entrar na plataforma'
            subheading='Use seu e-mail institucional'
            bullets={['Acesse suas turmas', 'Lance notas']}
          >
            <div>Conteúdo do formulário</div>
          </AuthShell>
        </BrowserRouter>
      );

      // Verificar elementos semânticos
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Voltar para página anterior')
      ).toBeInTheDocument();
      expect(screen.getByText('PROFESSOR')).toBeInTheDocument();
      expect(screen.getByText('Entrar na plataforma')).toBeInTheDocument();

      // Testar acessibilidade com axe
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Field', () => {
    it('deve ter labels associados corretamente', async () => {
      const { container } = render(
        <Field
          label='E-mail'
          type='email'
          required
          placeholder='seu@email.com'
        />
      );

      // Verificar associação label-input
      const input = screen.getByLabelText(/E-mail/);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('required');

      // Verificar indicador de campo obrigatório
      expect(screen.getByLabelText('obrigatório')).toBeInTheDocument();

      // Testar acessibilidade com axe
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('deve mostrar erros de forma acessível', async () => {
      const { container } = render(
        <Field label='Senha' type='password' error='Senha muito curta' />
      );

      // Verificar estado de erro
      const input = screen.getByLabelText(/Senha/);
      expect(input).toHaveAttribute('aria-invalid', 'true');

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Senha muito curta');

      // Testar acessibilidade com axe
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Button', () => {
    it('deve ter foco visível e ser navegável por teclado', async () => {
      const { container } = render(
        <Button variant='primary' onClick={jest.fn()}>
          Entrar
        </Button>
      );

      const button = screen.getByRole('button', { name: /Entrar/ });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('tabindex', '0');

      // Testar acessibilidade com axe
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('deve ser desabilitado corretamente', async () => {
      const { container } = render(
        <Button variant='primary' disabled>
          Carregando...
        </Button>
      );

      const button = screen.getByRole('button', { name: /Carregando/ });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('tabindex', '-1');

      // Testar acessibilidade com axe
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('AppShell - Navegação', () => {
    it('deve ter navegação acessível com aria-current', async () => {
      const { container } = render(
        <BrowserRouter>
          <AppShell>
            <div>Conteúdo da página</div>
          </AppShell>
        </BrowserRouter>
      );

      // Verificar navegação principal
      const nav = screen.getByRole('navigation', { name: 'Menu principal' });
      expect(nav).toBeInTheDocument();

      // Verificar links de navegação
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);

      // Verificar botão de logout
      const logoutButton = screen.getByLabelText('Fazer logout da conta');
      expect(logoutButton).toBeInTheDocument();

      // Testar acessibilidade com axe
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Formulários de Login', () => {
    it('deve ter estrutura semântica correta para login', async () => {
      const { container } = render(
        <BrowserRouter>
          <AuthShell
            roleLabel='Professor'
            heading='Entrar na plataforma'
            subheading='Use seu e-mail institucional'
          >
            <form>
              <Field
                label='E-mail'
                type='email'
                required
                placeholder='seu@email.com'
              />
              <Field
                label='Senha'
                type='password'
                required
                placeholder='Sua senha'
              />
              <Button type='submit'>Entrar</Button>
            </form>
          </AuthShell>
        </BrowserRouter>
      );

      // Verificar estrutura do formulário
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();

      // Verificar campos obrigatórios
      const emailField = screen.getByLabelText(/E-mail/);
      const passwordField = screen.getByLabelText(/Senha/);
      expect(emailField).toHaveAttribute('required');
      expect(passwordField).toHaveAttribute('required');

      // Verificar botão de submit
      const submitButton = screen.getByRole('button', { name: /Entrar/ });
      expect(submitButton).toHaveAttribute('type', 'submit');

      // Testar acessibilidade com axe
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
