import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ROUTES } from '@/routes';
import { setAuthToken, STORAGE_TOKEN_KEY } from '@/services/api';
import { usePrefetch } from '@/hooks/usePrefetch';
import { useFlag } from '@/flags';

type NavItem = { label: string; to: string; primary?: boolean };

const NAV_ALUNO: NavItem[] = [
  { label: 'Resumo', to: ROUTES.aluno.resumo, primary: true },
  { label: 'Notas', to: ROUTES.aluno.notas },
  { label: 'Recados', to: ROUTES.aluno.recados },
  { label: 'Gabaritos', to: ROUTES.aluno.gabaritos },
];

export default function AlunoShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { prefetchRoute } = usePrefetch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newMenuStyles] = useFlag('new_menu_styles', true);
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
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem('role');
      setAuthToken(undefined);
    } catch {}
    navigate(ROUTES.aluno.login, { replace: true });
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
            <Link to={goHomeByRole()} className='flex items-center gap-2'>
              <span className='inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ys-amber text-white font-black'>
                YS
              </span>
              <span className='font-semibold text-ys-ink'>Professor Yago</span>
            </Link>

            <nav className='hidden sm:flex items-center gap-1 justify-center flex-1'>
              {NAV_ALUNO.map(i => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  onMouseEnter={() => prefetchRoute(i.to)}
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
                >
                  {i.label}
                </NavLink>
              ))}
            </nav>

            <div className='hidden sm:flex items-center'>
              <button
                onClick={handleLogout}
                className={`ml-3 text-sm font-medium focus:outline-none ${
                  newMenuStyles
                    ? 'px-3 py-2 rounded-xl text-gray-800 hover:bg-orange-50 focus:ring-2 focus:ring-ys-amber focus:ring-offset-2'
                    : 'px-2 py-1 text-gray-600 hover:text-gray-900'
                }`}
              >
                Sair
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className='sm:hidden flex items-center'>
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
            </div>
          </div>
        </header>
      )}

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className='drawer-backdrop open sm:hidden'
            onClick={closeMobileMenu}
            aria-hidden='true'
          />
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
              {NAV_ALUNO.map(i => (
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

      <main className='relative z-10'>{children}</main>
    </div>
  );
}
