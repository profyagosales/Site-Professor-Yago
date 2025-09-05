import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes';
import { setAuthToken } from '@/services/api';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useFlag } from '@/flags';
import { useState } from 'react';
import CacheDebug from './CacheDebug';
import VitalsDebug from './VitalsDebug';

type NavItem = { label: string; to: string; primary?: boolean };

function getRole(): 'teacher' | 'student' | 'guest' {
  return (localStorage.getItem('role') as any) || 'guest';
}

const NAV_TEACHER: NavItem[] = [
  { label: 'Resumo', to: ROUTES.prof.resumo, primary: true },
  { label: 'Turmas', to: ROUTES.prof.turmas },
  { label: 'Alunos', to: ROUTES.prof.alunos },
  { label: 'Notas da Classe', to: ROUTES.prof.notasClasse },
  { label: 'Caderno', to: ROUTES.prof.caderno },
  { label: 'Gabarito', to: ROUTES.prof.gabarito },
  { label: 'Redação', to: ROUTES.prof.redacao },
];

const NAV_STUDENT: NavItem[] = [
  { label: 'Resumo', to: ROUTES.aluno.resumo, primary: true },
  { label: 'Notas', to: ROUTES.aluno.notas },
  { label: 'Recados', to: ROUTES.aluno.recados },
  { label: 'Redação', to: ROUTES.aluno.redacao },
  { label: 'Caderno', to: ROUTES.aluno.caderno },
  { label: 'Gabaritos', to: ROUTES.aluno.gabaritos },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { prefetchRoute } = usePrefetch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newMenuStyles] = useFlag('new_menu_styles', true);
  const role = getRole();
  const nav =
    role === 'teacher' ? NAV_TEACHER : role === 'student' ? NAV_STUDENT : [];
  const hideNav = [ROUTES.auth.loginProf, ROUTES.aluno.login].includes(
    loc.pathname
  );

  function goHomeByRole() {
    // Se pathname começa com /professor → ROUTES.prof.resumo
    if (loc.pathname.startsWith('/professor')) return ROUTES.prof.resumo;
    // Se começa com /aluno → ROUTES.aluno.resumo
    if (loc.pathname.startsWith('/aluno')) return ROUTES.aluno.resumo;
    // Senão → /
    return ROUTES.home;
  }

  function handleLogout() {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('role');
      setAuthToken(undefined);
    } catch {}
    const target = role === 'teacher' ? ROUTES.auth.loginProf : ROUTES.home;
    navigate(target, { replace: true });
  }

  function toggleMobileMenu() {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <div className='relative min-h-screen text-ys-ink z-10'>
      {!hideNav && (
        <header className='sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ys-line'>
          <div className='max-w-6xl mx-auto px-4 h-14 flex items-center justify-between'>
            <Link to={goHomeByRole()} className='flex items-center gap-2' data-testid="logo-link">
              <span className='inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ys-amber text-white font-black'>
                YS
              </span>
              <span className='font-semibold text-ys-ink'>Professor Yago</span>
            </Link>

            {/* Desktop Navigation */}
            <nav
              className='hidden sm:flex items-center gap-1 justify-center flex-1'
              role='navigation'
              aria-label='Menu principal'
            >
              {nav.map(i => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  onMouseEnter={() => prefetchRoute(i.to)}
                  data-testid={`nav-${i.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={({ isActive }) =>
                    [
                      newMenuStyles
                        ? 'px-3 py-2 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ys-amber focus:ring-offset-2'
                        : 'px-2 py-1 text-sm font-medium transition-colors focus:outline-none',
                      isActive
                        ? newMenuStyles
                          ? 'bg-orange-100 text-orange-700 font-semibold'
                          : 'text-orange-600 font-semibold'
                        : newMenuStyles
                          ? 'text-gray-800 hover:bg-orange-50'
                          : 'text-gray-600 hover:text-gray-900',
                      i.primary && !isActive ? 'font-semibold' : '',
                    ].join(' ')
                  }
                  aria-current={({ isActive }) =>
                    isActive ? 'page' : undefined
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className='hidden sm:flex items-center'>
              {nav.length > 0 && (
                <button
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className={`ml-3 text-sm font-medium focus:outline-none ${
                    newMenuStyles
                      ? 'px-3 py-2 rounded-xl text-gray-800 hover:bg-orange-50 focus:ring-2 focus:ring-ys-amber focus:ring-offset-2'
                      : 'px-2 py-1 text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label='Fazer logout da conta'
                >
                  Sair
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className='sm:hidden flex items-center'>
              {nav.length > 0 && (
                <>
                  <button
                    onClick={toggleMobileMenu}
                    className='p-2 rounded-xl text-gray-800 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-ys-amber focus:ring-offset-2'
                    aria-label='Abrir menu de navegação'
                    aria-expanded={isMobileMenuOpen}
                  >
                    <svg
                      className='h-6 w-6'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      {isMobileMenuOpen ? (
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M6 18L18 6M6 6l12 12'
                        />
                      ) : (
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M4 6h16M4 12h16M4 18h16'
                        />
                      )}
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Drawer */}
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className='drawer-backdrop open sm:hidden'
                onClick={closeMobileMenu}
                aria-hidden='true'
              />

              {/* Drawer */}
              <div className='drawer-mobile open sm:hidden'>
                <div className='p-4 border-b border-ys-line'>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-lg font-semibold text-ys-ink'>Menu</h2>
                    <button
                      onClick={closeMobileMenu}
                      className='p-2 rounded-xl text-gray-800 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-ys-amber focus:ring-offset-2'
                      aria-label='Fechar menu'
                    >
                      <svg
                        className='h-6 w-6'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M6 18L18 6M6 6l12 12'
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <nav
                  className='p-4 space-y-2'
                  role='navigation'
                  aria-label='Menu mobile'
                >
                  {nav.map(i => (
                    <NavLink
                      key={i.to}
                      to={i.to}
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        [
                          newMenuStyles
                            ? 'block px-4 py-3 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ys-amber focus:ring-offset-2'
                            : 'block px-3 py-2 text-sm font-medium transition-colors focus:outline-none',
                          isActive
                            ? newMenuStyles
                              ? 'bg-orange-100 text-orange-700 font-semibold'
                              : 'text-orange-600 font-semibold'
                            : newMenuStyles
                              ? 'text-gray-800 hover:bg-orange-50'
                              : 'text-gray-600 hover:text-gray-900',
                          i.primary && !isActive ? 'font-semibold' : '',
                        ].join(' ')
                      }
                      aria-current={({ isActive }) =>
                        isActive ? 'page' : undefined
                      }
                    >
                      {i.label}
                    </NavLink>
                  ))}

                  <div className='pt-4 border-t border-ys-line mt-4'>
                    <button
                      onClick={() => {
                        closeMobileMenu();
                        handleLogout();
                      }}
                      className={`w-full text-sm font-medium focus:outline-none ${
                        newMenuStyles
                          ? 'px-4 py-3 rounded-xl text-gray-800 hover:bg-orange-50 focus:ring-2 focus:ring-ys-amber focus:ring-offset-2'
                          : 'px-3 py-2 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Sair
                    </button>
                  </div>
                </nav>
              </div>
            </>
          )}
        </header>
      )}

      <main className='relative z-10'>{children}</main>

      {/* Debug Components */}
      <CacheDebug />
      <VitalsDebug />
    </div>
  );
}
