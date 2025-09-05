/**
 * Testes para utilitários de query string
 *
 * Cobre:
 * - Serialização e deserialização
 * - Validação de parâmetros
 * - Sanitização
 * - Mesclagem de query strings
 */

import {
  objectToQueryString,
  queryStringToObject,
  isValidQueryString,
  sanitizeQueryString,
  mergeQueryStrings,
  removeQueryParams,
  preserveQueryParams,
  validators,
  transformers,
  dashboardQueryConfig,
} from '@/utils/queryString';

describe('Query String Utils', () => {
  describe('objectToQueryString', () => {
    it('deve converter objeto simples em query string', () => {
      const obj = { page: 1, size: 10, q: 'test' };
      const result = objectToQueryString(obj);
      expect(result).toBe('page=1&size=10&q=test');
    });

    it('deve ignorar valores vazios', () => {
      const obj = { page: 1, q: '', size: 10, empty: null };
      const result = objectToQueryString(obj);
      expect(result).toBe('page=1&size=10');
    });

    it('deve validar valores se função for fornecida', () => {
      const obj = { page: 1, size: 10, invalid: 'bad' };
      const validate = (key: string, value: any) => key !== 'invalid';
      const result = objectToQueryString(obj, { validate });
      expect(result).toBe('page=1&size=10');
    });

    it('deve transformar valores se função for fornecida', () => {
      const obj = { page: '1', size: '10' };
      const transform = (key: string, value: any) =>
        key === 'page' || key === 'size' ? Number(value) : value;
      const result = objectToQueryString(obj, { transform });
      expect(result).toBe('page=1&size=10');
    });
  });

  describe('queryStringToObject', () => {
    it('deve converter query string em objeto', () => {
      const queryString = 'page=1&size=10&q=test';
      const result = queryStringToObject(queryString);
      expect(result).toEqual({ page: '1', size: '10', q: 'test' });
    });

    it('deve aplicar valores padrão', () => {
      const queryString = 'page=2';
      const defaults = { page: 1, size: 10 };
      const result = queryStringToObject(queryString, { defaults });
      expect(result).toEqual({ page: '2', size: 10 });
    });

    it('deve validar valores se função for fornecida', () => {
      const queryString = 'page=1&size=10&invalid=bad';
      const validate = (key: string, value: any) => key !== 'invalid';
      const result = queryStringToObject(queryString, { validate });
      expect(result).toEqual({ page: '1', size: '10' });
    });

    it('deve transformar valores se função for fornecida', () => {
      const queryString = 'page=1&size=10';
      const transform = (key: string, value: any) =>
        key === 'page' || key === 'size' ? Number(value) : value;
      const result = queryStringToObject(queryString, { transform });
      expect(result).toEqual({ page: 1, size: 10 });
    });
  });

  describe('isValidQueryString', () => {
    it('deve retornar true para query string válida', () => {
      const result = isValidQueryString('page=1&size=10');
      expect(result).toBe(true);
    });

    it('deve retornar false para query string inválida', () => {
      const result = isValidQueryString('invalid');
      expect(result).toBe(false);
    });

    it('deve validar com função personalizada', () => {
      const validate = (key: string, value: any) => key === 'page';
      const result = isValidQueryString('page=1&size=10', { validate });
      expect(result).toBe(true);
    });
  });

  describe('sanitizeQueryString', () => {
    it('deve remover parâmetros inválidos', () => {
      const queryString = 'page=1&size=10&invalid=bad';
      const validate = (key: string, value: any) => key !== 'invalid';
      const result = sanitizeQueryString(queryString, { validate });
      expect(result).toBe('page=1&size=10');
    });
  });

  describe('mergeQueryStrings', () => {
    it('deve mesclar duas query strings', () => {
      const base = 'page=1&size=10';
      const updates = 'page=2&q=test';
      const result = mergeQueryStrings(base, updates);
      expect(result).toBe('page=2&size=10&q=test');
    });
  });

  describe('removeQueryParams', () => {
    it('deve remover parâmetros especificados', () => {
      const queryString = 'page=1&size=10&q=test';
      const result = removeQueryParams(queryString, ['q']);
      expect(result).toBe('page=1&size=10');
    });
  });

  describe('preserveQueryParams', () => {
    it('deve preservar apenas parâmetros especificados', () => {
      const queryString = 'page=1&size=10&q=test&other=value';
      const result = preserveQueryParams(queryString, ['page', 'q']);
      expect(result).toBe('page=1&q=test');
    });
  });

  describe('validators', () => {
    it('deve validar números corretamente', () => {
      expect(validators.number('page', 1)).toBe(true);
      expect(validators.number('page', 0)).toBe(false);
      expect(validators.number('page', -1)).toBe(false);
      expect(validators.number('page', '1')).toBe(false);
    });

    it('deve validar strings corretamente', () => {
      expect(validators.string('q', 'test')).toBe(true);
      expect(validators.string('q', '')).toBe(false);
      expect(validators.string('q', 1)).toBe(false);
    });

    it('deve validar enum corretamente', () => {
      const enumValidator = validators.enum(['a', 'b', 'c']);
      expect(enumValidator('type', 'a')).toBe(true);
      expect(enumValidator('type', 'd')).toBe(false);
    });

    it('deve validar range corretamente', () => {
      const rangeValidator = validators.range(1, 10);
      expect(rangeValidator('page', 5)).toBe(true);
      expect(rangeValidator('page', 0)).toBe(false);
      expect(rangeValidator('page', 11)).toBe(false);
    });
  });

  describe('transformers', () => {
    it('deve transformar para número', () => {
      expect(transformers.number('page', '1')).toBe(1);
      expect(transformers.number('page', 'invalid')).toBe('invalid');
    });

    it('deve transformar para string', () => {
      expect(transformers.string('page', 1)).toBe('1');
    });

    it('deve transformar para boolean', () => {
      expect(transformers.boolean('active', 'true')).toBe(true);
      expect(transformers.boolean('active', true)).toBe(true);
      expect(transformers.boolean('active', 'false')).toBe(false);
    });

    it('deve trim strings', () => {
      expect(transformers.trim('q', '  test  ')).toBe('test');
    });
  });

  describe('dashboardQueryConfig', () => {
    it('deve ter configuração correta', () => {
      expect(dashboardQueryConfig.defaults).toEqual({
        status: 'pendentes',
        page: 1,
        pageSize: 10,
        q: '',
        classId: '',
        bimester: '',
        type: '',
      });
    });

    it('deve validar parâmetros corretamente', () => {
      const { validate } = dashboardQueryConfig;
      expect(validate?.('status', 'pendentes')).toBe(true);
      expect(validate?.('status', 'invalid')).toBe(false);
      expect(validate?.('page', 1)).toBe(true);
      expect(validate?.('page', 0)).toBe(false);
      expect(validate?.('bimester', '1')).toBe(true);
      expect(validate?.('bimester', '5')).toBe(false);
    });

    it('deve transformar parâmetros corretamente', () => {
      const { transform } = dashboardQueryConfig;
      expect(transform?.('page', '1')).toBe(1);
      expect(transform?.('pageSize', '10')).toBe(10);
      expect(transform?.('status', 'pendentes')).toBe('pendentes');
    });
  });
});
