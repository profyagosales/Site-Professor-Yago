import {
  validateRoutes,
  validateAndReportRoutes,
  RouteNode,
} from '@/routes/validateRoutes';
import React from 'react';

describe('Router Validation', () => {
  describe('validateRoutes', () => {
    it('deve validar rotas corretas sem erros', () => {
      const routes: RouteNode[] = [
        {
          path: '/',
          element: React.createElement('div', null, 'Home'),
        },
        {
          path: '/about',
          element: React.createElement('div', null, 'About'),
        },
        {
          path: '/nested',
          children: [
            {
              path: 'child', // path relativo correto
              element: React.createElement('div', null, 'Child'),
            },
          ],
        },
        {
          path: '*', // catch-all
          element: React.createElement('div', null, 'NotFound'),
        },
      ];

      const result = validateRoutes(routes);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve detectar paths absolutos em rotas aninhadas', () => {
      const routes: RouteNode[] = [
        {
          path: '/parent',
          children: [
            {
              path: '/absolute', // ❌ path absoluto em rota aninhada
              element: React.createElement('div', null, 'Child'),
            },
          ],
        },
      ];

      const result = validateRoutes(routes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Route with path "/absolute" is nested under "/parent" but starts with "/". Nested routes should use relative paths.'
      );
    });

    it('deve detectar paths duplicados', () => {
      const routes: RouteNode[] = [
        {
          path: '/duplicate',
          element: React.createElement('div', null, 'First'),
        },
        {
          path: '/duplicate', // ❌ path duplicado
          element: React.createElement('div', null, 'Second'),
        },
      ];

      const result = validateRoutes(routes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Duplicate path "/duplicate" found. Already defined at: /duplicate'
      );
    });

    it('deve detectar múltiplas rotas index no mesmo nível', () => {
      const routes: RouteNode[] = [
        {
          index: true,
          element: React.createElement('div', null, 'First Index'),
        },
        {
          index: true, // ❌ múltiplas rotas index
          element: React.createElement('div', null, 'Second Index'),
        },
      ];

      const result = validateRoutes(routes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Multiple index routes found in the same level. Only one index route is allowed per level.'
      );
    });

    it('deve detectar paths vazios', () => {
      const routes: RouteNode[] = [
        {
          path: '', // ❌ path vazio
          element: React.createElement('div', null, 'Empty'),
        },
      ];

      const result = validateRoutes(routes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Route path cannot be empty string. Use index: true for index routes.'
      );
    });

    it('deve detectar paths com double slashes', () => {
      const routes: RouteNode[] = [
        {
          path: '/path//with//slashes', // ❌ double slashes
          element: React.createElement('div', null, 'Invalid'),
        },
      ];

      const result = validateRoutes(routes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Route path "/path//with//slashes" contains double slashes.'
      );
    });

    it('deve detectar paths terminando com /', () => {
      const routes: RouteNode[] = [
        {
          path: '/path/', // ❌ termina com /
          element: React.createElement('div', null, 'Invalid'),
        },
      ];

      const result = validateRoutes(routes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Route path "/path/" should not end with "/".'
      );
    });

    it('deve avisar sobre falta de catch-all route', () => {
      const routes: RouteNode[] = [
        {
          path: '/home',
          element: React.createElement('div', null, 'Home'),
        },
        // Sem catch-all (*)
      ];

      const result = validateRoutes(routes);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'No catch-all route (*) found. 404 pages may not work properly.'
      );
    });

    it('deve avisar sobre array de rotas vazio', () => {
      const routes: RouteNode[] = [];

      const result = validateRoutes(routes);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'No routes defined. Router will not work properly.'
      );
    });
  });

  describe('validateAndReportRoutes', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('deve reportar sucesso em desenvolvimento', () => {
      const routes: RouteNode[] = [
        {
          path: '/',
          element: React.createElement('div', null, 'Home'),
        },
        {
          path: '*',
          element: React.createElement('div', null, 'NotFound'),
        },
      ];

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = validateAndReportRoutes(routes);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('✅ Routes validation passed');

      process.env.NODE_ENV = originalEnv;
    });

    it('deve reportar erros em desenvolvimento', () => {
      const routes: RouteNode[] = [
        {
          path: '/parent',
          children: [
            {
              path: '/absolute', // ❌ erro
              element: React.createElement('div', null, 'Child'),
            },
          ],
        },
      ];

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = validateAndReportRoutes(routes);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '🚨 Route validation errors:',
        expect.any(Array)
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('não deve reportar em produção', () => {
      const routes: RouteNode[] = [
        {
          path: '/parent',
          children: [
            {
              path: '/absolute', // ❌ erro
              element: React.createElement('div', null, 'Child'),
            },
          ],
        },
      ];

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = validateAndReportRoutes(routes);

      expect(result).toBe(false);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
