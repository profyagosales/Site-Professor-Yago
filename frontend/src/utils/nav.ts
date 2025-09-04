/**
 * Utilitário para verificar se uma rota está ativa
 * @param pathname - Caminho atual da página
 * @param route - Rota a ser verificada
 * @param exact - Se deve fazer comparação exata (padrão: false)
 * @returns true se a rota estiver ativa
 */
export function isActive(
  pathname: string,
  route: string,
  exact: boolean = false
): boolean {
  if (exact) {
    return pathname === route;
  }

  // Para seções, usa startsWith para capturar subrotas
  // Ex: /professor/redacao/123 deve ativar /professor/redacao
  return pathname.startsWith(route);
}

/**
 * Gera classes CSS para item de menu baseado no estado ativo
 * @param isActive - Se o item está ativo
 * @param primary - Se é um item primário
 * @returns string com classes CSS
 */
export function getNavItemClasses(
  isActive: boolean,
  primary: boolean = false
): string {
  const baseClasses =
    'px-3 py-2 rounded-xl text-sm font-medium transition-colors';

  if (isActive) {
    return `${baseClasses} bg-orange-100 text-orange-700 font-semibold`;
  }

  const hoverClasses = 'text-gray-800 hover:bg-orange-50';
  const primaryClasses = primary ? 'font-semibold' : '';

  return [baseClasses, hoverClasses, primaryClasses].filter(Boolean).join(' ');
}
