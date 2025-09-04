/**
 * Validador de rotas para React Router
 * Verifica invariantes importantes para evitar erros comuns
 */

export interface RouteNode {
  path?: string;
  index?: boolean;
  children?: RouteNode[];
  element?: React.ReactNode;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida se rotas filhas não iniciam com / quando aninhadas
 */
function validateNestedPaths(routes: RouteNode[], parentPath = ''): string[] {
  const errors: string[] = [];

  for (const route of routes) {
    if (route.path && route.path.startsWith('/') && parentPath) {
      errors.push(
        `Route with path "${route.path}" is nested under "${parentPath.replace(/\/+/g, '/')}" but starts with "/". ` +
        `Nested routes should use relative paths.`
      );
    }

    if (route.children) {
      const childPath = route.path ? `${parentPath}/${route.path}` : parentPath;
      errors.push(...validateNestedPaths(route.children, childPath));
    }
  }

  return errors;
}

/**
 * Valida se há duplicidade de paths
 */
function validateDuplicatePaths(
  routes: RouteNode[],
  pathMap = new Map<string, string[]>()
): string[] {
  const errors: string[] = [];

  for (const route of routes) {
    if (route.path) {
      const fullPath = route.path.startsWith('/')
        ? route.path
        : `/${route.path}`;
      const existing = pathMap.get(fullPath) || [];
      pathMap.set(fullPath, [...existing, route.path]);

      if (existing.length > 0) {
        errors.push(
          `Duplicate path "${route.path}" found. ` +
            `Already defined at: ${existing.join(', ')}`
        );
      }
    }

    if (route.children) {
      errors.push(...validateDuplicatePaths(route.children, pathMap));
    }
  }

  return errors;
}

/**
 * Valida se há rotas index duplicadas no mesmo nível
 */
function validateIndexRoutes(routes: RouteNode[]): string[] {
  const errors: string[] = [];
  let indexCount = 0;

  for (const route of routes) {
    if (route.index) {
      indexCount++;
    }

    if (route.children) {
      errors.push(...validateIndexRoutes(route.children));
    }
  }

  if (indexCount > 1) {
    errors.push(
      `Multiple index routes found in the same level. ` +
        `Only one index route is allowed per level.`
    );
  }

  return errors;
}

/**
 * Valida se há paths vazios ou inválidos
 */
function validatePathFormat(routes: RouteNode[]): string[] {
  const errors: string[] = [];

  for (const route of routes) {
    if (route.path !== undefined) {
      if (route.path === '') {
        errors.push(
          'Route path cannot be empty string. Use index: true for index routes.'
        );
      } else if (route.path.includes('//')) {
        errors.push(`Route path "${route.path}" contains double slashes.`);
      } else if (route.path.endsWith('/') && route.path !== '/') {
        errors.push(`Route path "${route.path}" should not end with "/".`);
      }
    }

    if (route.children) {
      errors.push(...validatePathFormat(route.children));
    }
  }

  return errors;
}

/**
 * Valida a estrutura completa das rotas
 */
export function validateRoutes(routes: RouteNode[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validações de erro (impedem funcionamento)
  errors.push(...validateNestedPaths(routes));
  errors.push(...validateDuplicatePaths(routes));
  errors.push(...validateIndexRoutes(routes));
  errors.push(...validatePathFormat(routes));

  // Validações de warning (funcionam mas podem causar problemas)
  if (routes.length === 0) {
    warnings.push('No routes defined. Router will not work properly.');
  }

  // Verifica se há pelo menos uma rota catch-all (*)
  const hasCatchAll = routes.some(
    route => route.path === '*' || route.path === '/*'
  );
  if (!hasCatchAll) {
    warnings.push(
      'No catch-all route (*) found. 404 pages may not work properly.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida e reporta problemas das rotas em desenvolvimento
 */
export function validateAndReportRoutes(routes: RouteNode[]): boolean {
  const result = validateRoutes(routes);

  if (process.env.NODE_ENV === 'development') {
    if (result.errors.length > 0) {
      console.error('🚨 Route validation errors:', result.errors);
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️ Route validation warnings:', result.warnings);
    }

    if (result.isValid && result.warnings.length === 0) {
      console.log('✅ Routes validation passed');
    }
  }

  return result.isValid;
}
