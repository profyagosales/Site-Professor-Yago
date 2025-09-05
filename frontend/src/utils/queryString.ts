/**
 * Utilitários para manipulação de query strings
 *
 * Funcionalidades:
 * - Serialização e deserialização de objetos
 * - Validação de parâmetros
 * - Sanitização de valores
 * - Preservação de tipos
 */

export interface QueryStringOptions {
  // Função para validar valores
  validate?: (key: string, value: any) => boolean;
  // Função para transformar valores
  transform?: (key: string, value: any) => any;
  // Parâmetros que devem ser preservados
  preserve?: string[];
  // Valores padrão
  defaults?: Record<string, any>;
}

/**
 * Converte um objeto em query string
 */
export function objectToQueryString(
  obj: Record<string, any>,
  options: QueryStringOptions = {}
): string {
  const { validate, transform } = options;
  const params = new URLSearchParams();

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    // Transforma valor se função for fornecida
    const transformedValue = transform ? transform(key, value) : value;

    // Valida valor se função for fornecida
    if (validate && !validate(key, transformedValue)) {
      console.warn(`Invalid value for parameter ${key}:`, transformedValue);
      return;
    }

    // Adiciona ao query string
    params.set(key, String(transformedValue));
  });

  return params.toString();
}

/**
 * Converte uma query string em objeto
 */
export function queryStringToObject(
  queryString: string,
  options: QueryStringOptions = {}
): Record<string, any> {
  const { validate, transform, defaults = {} } = options;
  const params = new URLSearchParams(queryString);
  const result: Record<string, any> = { ...defaults };

  for (const [key, value] of params.entries()) {
    if (!value) continue;

    // Transforma valor se função for fornecida
    const transformedValue = transform ? transform(key, value) : value;

    // Valida valor se função for fornecida
    if (validate && !validate(key, transformedValue)) {
      console.warn(`Invalid value for parameter ${key}:`, transformedValue);
      continue;
    }

    result[key] = transformedValue;
  }

  return result;
}

/**
 * Valida se uma query string é válida
 */
export function isValidQueryString(
  queryString: string,
  options: QueryStringOptions = {}
): boolean {
  try {
    const obj = queryStringToObject(queryString, options);
    return Object.keys(obj).length > 0;
  } catch {
    return false;
  }
}

/**
 * Sanitiza uma query string removendo parâmetros inválidos
 */
export function sanitizeQueryString(
  queryString: string,
  options: QueryStringOptions = {}
): string {
  const obj = queryStringToObject(queryString, options);
  return objectToQueryString(obj, options);
}

/**
 * Mescla duas query strings
 */
export function mergeQueryStrings(
  base: string,
  updates: string,
  options: QueryStringOptions = {}
): string {
  const baseObj = queryStringToObject(base, options);
  const updatesObj = queryStringToObject(updates, options);
  const merged = { ...baseObj, ...updatesObj };
  return objectToQueryString(merged, options);
}

/**
 * Remove parâmetros de uma query string
 */
export function removeQueryParams(
  queryString: string,
  paramsToRemove: string[]
): string {
  const params = new URLSearchParams(queryString);

  paramsToRemove.forEach(param => {
    params.delete(param);
  });

  return params.toString();
}

/**
 * Preserva parâmetros específicos de uma query string
 */
export function preserveQueryParams(
  queryString: string,
  paramsToPreserve: string[]
): string {
  const params = new URLSearchParams(queryString);
  const preserved: Record<string, string> = {};

  paramsToPreserve.forEach(param => {
    if (params.has(param)) {
      preserved[param] = params.get(param) || '';
    }
  });

  return objectToQueryString(preserved);
}

/**
 * Validações comuns para parâmetros
 */
export const validators = {
  number: (key: string, value: any): boolean => {
    return typeof value === 'number' && !isNaN(value) && value > 0;
  },

  string: (key: string, value: any): boolean => {
    return typeof value === 'string' && value.length > 0;
  },

  enum:
    (values: any[]) =>
    (key: string, value: any): boolean => {
      return values.includes(value);
    },

  range:
    (min: number, max: number) =>
    (key: string, value: any): boolean => {
      return typeof value === 'number' && value >= min && value <= max;
    },
};

/**
 * Transformações comuns para parâmetros
 */
export const transformers = {
  number: (key: string, value: any): any => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  },

  string: (key: string, value: any): any => {
    return String(value);
  },

  boolean: (key: string, value: any): any => {
    return value === 'true' || value === true;
  },

  trim: (key: string, value: any): any => {
    return typeof value === 'string' ? value.trim() : value;
  },
};

/**
 * Configurações padrão para dashboard de redações
 */
export const dashboardQueryConfig: QueryStringOptions = {
  validate: (key, value) => {
    switch (key) {
      case 'status':
        return ['pendentes', 'corrigidas'].includes(value);
      case 'page':
      case 'pageSize':
        return typeof value === 'number' && value > 0;
      case 'bimester':
        return ['', '1', '2', '3', '4'].includes(value);
      case 'type':
        return ['', 'ENEM', 'PAS'].includes(value);
      default:
        return true;
    }
  },
  transform: (key, value) => {
    switch (key) {
      case 'page':
      case 'pageSize':
        return Number(value);
      default:
        return value;
    }
  },
  defaults: {
    status: 'pendentes',
    page: 1,
    pageSize: 10,
    q: '',
    classId: '',
    bimester: '',
    type: '',
  },
};
