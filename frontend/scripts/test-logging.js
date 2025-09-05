import { logger } from '../src/lib/logger.ts';

/**
 * Script para testar o sistema de logging
 */
export function testLogging() {
  console.log('\n🧪 Testing Logging System:');
  console.log('='.repeat(50));

  // Testar diferentes níveis de log
  console.log('\n📝 Testing log levels:');
  
  logger.info('Test info message', {
    component: 'test',
    action: 'info',
    test: true,
  });

  logger.warn('Test warning message', {
    component: 'test',
    action: 'warn',
    test: true,
  });

  logger.error('Test error message', {
    component: 'test',
    action: 'error',
    test: true,
  }, new Error('Test error'));

  // Testar logging de performance
  console.log('\n⏱️ Testing performance logging:');
  logger.performance('Test operation', 150, {
    component: 'test',
    action: 'performance',
  });

  // Testar logging de navegação
  console.log('\n🧭 Testing navigation logging:');
  logger.navigation('/home', '/dashboard', {
    component: 'test',
    action: 'navigation',
  });

  // Testar logging de API
  console.log('\n🌐 Testing API logging:');
  logger.api('GET', '/api/test', 200, 250, 1024);
  logger.apiError('POST', '/api/error', new Error('API Error'), 100);

  // Testar logging de autenticação
  console.log('\n🔐 Testing auth logging:');
  logger.auth('login', true, {
    component: 'test',
    action: 'auth',
  });
  logger.authError('login', new Error('Auth Error'), {
    component: 'test',
    action: 'auth',
  });

  // Testar configuração
  console.log('\n⚙️ Testing configuration:');
  console.log('Logging enabled:', logger.isLoggingEnabled());
  
  // Testar desabilitar/habilitar
  logger.setEnabled(false);
  console.log('After disabling - enabled:', logger.isLoggingEnabled());
  
  logger.setEnabled(true);
  console.log('After re-enabling - enabled:', logger.isLoggingEnabled());

  // Testar Sentry integration (se disponível)
  console.log('\n🔗 Testing Sentry integration:');
  if (typeof window !== 'undefined' && window.__SENTRY__) {
    console.log('Sentry available:', true);
    logger.error('Test Sentry error', {
      component: 'test',
      action: 'sentry',
    });
  } else {
    console.log('Sentry not available (expected in test environment)');
  }

  console.log('\n✅ Logging system test completed!');
  console.log('='.repeat(50));
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testLogging();
}

/**
 * Script para testar o sistema de logging
 */
export function testLogging() {
  console.log('\n🧪 Testing Logging System:');
  console.log('='.repeat(50));

  // Testar diferentes níveis de log
  console.log('\n📝 Testing log levels:');
  
  logger.info('Test info message', {
    component: 'test',
    action: 'info',
    test: true,
  });

  logger.warn('Test warning message', {
    component: 'test',
    action: 'warn',
    test: true,
  });

  logger.error('Test error message', {
    component: 'test',
    action: 'error',
    test: true,
  }, new Error('Test error'));

  // Testar logging de performance
  console.log('\n⏱️ Testing performance logging:');
  logger.performance('Test operation', 150, {
    component: 'test',
    action: 'performance',
  });

  // Testar logging de navegação
  console.log('\n🧭 Testing navigation logging:');
  logger.navigation('/home', '/dashboard', {
    component: 'test',
    action: 'navigation',
  });

  // Testar logging de API
  console.log('\n🌐 Testing API logging:');
  logger.api('GET', '/api/test', 200, 250, 1024);
  logger.apiError('POST', '/api/error', new Error('API Error'), 100);

  // Testar logging de autenticação
  console.log('\n🔐 Testing auth logging:');
  logger.auth('login', true, {
    component: 'test',
    action: 'auth',
  });
  logger.authError('login', new Error('Auth Error'), {
    component: 'test',
    action: 'auth',
  });

  // Testar configuração
  console.log('\n⚙️ Testing configuration:');
  console.log('Logging enabled:', logger.isLoggingEnabled());
  
  // Testar desabilitar/habilitar
  logger.setEnabled(false);
  console.log('After disabling - enabled:', logger.isLoggingEnabled());
  
  logger.setEnabled(true);
  console.log('After re-enabling - enabled:', logger.isLoggingEnabled());

  // Testar Sentry integration (se disponível)
  console.log('\n🔗 Testing Sentry integration:');
  if (typeof window !== 'undefined' && window.__SENTRY__) {
    console.log('Sentry available:', true);
    logger.error('Test Sentry error', {
      component: 'test',
      action: 'sentry',
    });
  } else {
    console.log('Sentry not available (expected in test environment)');
  }

  console.log('\n✅ Logging system test completed!');
  console.log('='.repeat(50));
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testLogging();
}
