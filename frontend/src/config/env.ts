// Configuração de variáveis de ambiente compatível com Jest
export const env = {
  VITE_USE_RICH_ANNOS:
    process.env.NODE_ENV === 'test'
      ? 'false'
      : process.env.VITE_USE_RICH_ANNOS || 'false',
  VITE_PDF_IFRAME:
    process.env.NODE_ENV === 'test'
      ? 'true'
      : process.env.VITE_PDF_IFRAME || 'true',
};

export const useRich =
  env.VITE_USE_RICH_ANNOS === '1' || env.VITE_USE_RICH_ANNOS === 'true';
export const useIframe = env.VITE_PDF_IFRAME !== '0';
