import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/routes';

/**
 * Hook para gerenciar navegação "Voltar" com fallback inteligente
 * Se houver histórico válido, usa navigate(-1), senão usa goHomeByRole()
 */
export function useBackNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  function goHomeByRole() {
    // Se pathname começa com /professor → ROUTES.prof.resumo
    if (location.pathname.startsWith('/professor')) return ROUTES.prof.resumo;
    // Se começa com /aluno → ROUTES.aluno.resumo
    if (location.pathname.startsWith('/aluno')) return ROUTES.aluno.resumo;
    // Senão → /
    return ROUTES.home;
  }

  function handleBack() {
    // Verifica se há histórico válido (não é a primeira página da sessão)
    const hasHistory = window.history.length > 1;

    if (hasHistory) {
      // Tenta voltar no histórico
      navigate(-1);
    } else {
      // Fallback para home baseado no papel/contexto
      navigate(goHomeByRole(), { replace: true });
    }
  }

  return {
    handleBack,
    goHomeByRole,
  };
}
