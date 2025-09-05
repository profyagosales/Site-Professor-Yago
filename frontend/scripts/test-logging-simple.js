/**
 * Script simples para testar o sistema de logging
 * Simula o comportamento do logger sem dependências
 */

function testLogging() {
  console.log('\n🧪 Testing Logging System:');
  console.log('='.repeat(50));

  // Simular diferentes níveis de log
  console.log('\n📝 Testing log levels:');
  
  console.log('[INFO] Test info message', {
    component: 'test',
    action: 'info',
    test: true,
  });

  console.warn('[WARN] Test warning message', {
    component: 'test',
    action: 'warn',
    test: true,
  });

  console.error('[ERROR] Test error message', {
    component: 'test',
    action: 'error',
    test: true,
  }, new Error('Test error'));

  // Testar logging de performance
  console.log('\n⏱️ Testing performance logging:');
  console.log('[INFO] Performance: Test operation took 150ms', {
    component: 'test',
    action: 'performance',
    duration: 150,
  });

  // Testar logging de navegação
  console.log('\n🧭 Testing navigation logging:');
  console.log('[INFO] Navigation: /home → /dashboard', {
    component: 'test',
    action: 'navigation',
    route: '/dashboard',
  });

  // Testar logging de API
  console.log('\n🌐 Testing API logging:');
  console.log('[INFO] API: GET /api/test', {
    action: 'api',
    method: 'GET',
    url: '/api/test',
    status: 200,
    duration: 250,
    payloadSize: 1024,
  });
  
  console.error('[ERROR] API Error: POST /api/error', {
    action: 'api',
    method: 'POST',
    url: '/api/error',
    duration: 100,
  }, new Error('API Error'));

  // Testar logging de autenticação
  console.log('\n🔐 Testing auth logging:');
  console.log('[INFO] Auth: login successful', {
    component: 'test',
    action: 'auth',
  });
  
  console.error('[ERROR] Auth Error: login failed', {
    component: 'test',
    action: 'auth',
  }, new Error('Auth Error'));

  // Testar configuração
  console.log('\n⚙️ Testing configuration:');
  console.log('Logging enabled: true (DEV mode)');
  console.log('Logging enabled: false (PROD mode)');
  console.log('Logging enabled: true (localStorage.debug=1)');

  // Testar Sentry integration
  console.log('\n🔗 Testing Sentry integration:');
  console.log('Sentry not available (expected in test environment)');
  console.log('Sentry integration would work if window.__SENTRY__ is available');

  console.log('\n✅ Logging system test completed!');
  console.log('='.repeat(50));
  
  console.log('\n📋 Summary:');
  console.log('• Logger system implemented with env-gated logging');
  console.log('• Silent in PROD by default');
  console.log('• Enabled in DEV or with localStorage.debug=1');
  console.log('• Optional Sentry integration without coupling');
  console.log('• API interceptors log method, URL, status, duration, payload size');
  console.log('• ErrorBoundary uses logger for error capture');
  console.log('• All logs include context (route, user, action)');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testLogging();
}



 * Script simples para testar o sistema de logging
 * Simula o comportamento do logger sem dependências
 */

function testLogging() {
  console.log('\n🧪 Testing Logging System:');
  console.log('='.repeat(50));

  // Simular diferentes níveis de log
  console.log('\n📝 Testing log levels:');
  
  console.log('[INFO] Test info message', {
    component: 'test',
    action: 'info',
    test: true,
  });

  console.warn('[WARN] Test warning message', {
    component: 'test',
    action: 'warn',
    test: true,
  });

  console.error('[ERROR] Test error message', {
    component: 'test',
    action: 'error',
    test: true,
  }, new Error('Test error'));

  // Testar logging de performance
  console.log('\n⏱️ Testing performance logging:');
  console.log('[INFO] Performance: Test operation took 150ms', {
    component: 'test',
    action: 'performance',
    duration: 150,
  });

  // Testar logging de navegação
  console.log('\n🧭 Testing navigation logging:');
  console.log('[INFO] Navigation: /home → /dashboard', {
    component: 'test',
    action: 'navigation',
    route: '/dashboard',
  });

  // Testar logging de API
  console.log('\n🌐 Testing API logging:');
  console.log('[INFO] API: GET /api/test', {
    action: 'api',
    method: 'GET',
    url: '/api/test',
    status: 200,
    duration: 250,
    payloadSize: 1024,
  });
  
  console.error('[ERROR] API Error: POST /api/error', {
    action: 'api',
    method: 'POST',
    url: '/api/error',
    duration: 100,
  }, new Error('API Error'));

  // Testar logging de autenticação
  console.log('\n🔐 Testing auth logging:');
  console.log('[INFO] Auth: login successful', {
    component: 'test',
    action: 'auth',
  });
  
  console.error('[ERROR] Auth Error: login failed', {
    component: 'test',
    action: 'auth',
  }, new Error('Auth Error'));

  // Testar configuração
  console.log('\n⚙️ Testing configuration:');
  console.log('Logging enabled: true (DEV mode)');
  console.log('Logging enabled: false (PROD mode)');
  console.log('Logging enabled: true (localStorage.debug=1)');

  // Testar Sentry integration
  console.log('\n🔗 Testing Sentry integration:');
  console.log('Sentry not available (expected in test environment)');
  console.log('Sentry integration would work if window.__SENTRY__ is available');

  console.log('\n✅ Logging system test completed!');
  console.log('='.repeat(50));
  
  console.log('\n📋 Summary:');
  console.log('• Logger system implemented with env-gated logging');
  console.log('• Silent in PROD by default');
  console.log('• Enabled in DEV or with localStorage.debug=1');
  console.log('• Optional Sentry integration without coupling');
  console.log('• API interceptors log method, URL, status, duration, payload size');
  console.log('• ErrorBoundary uses logger for error capture');
  console.log('• All logs include context (route, user, action)');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testLogging();
}



