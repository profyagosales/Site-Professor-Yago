import { Page } from '@playwright/test';

export interface MockData {
  professor: {
    token: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: 'professor';
    };
  };
  aluno: {
    token: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: 'aluno';
    };
  };
  essays: Array<{
    id: string;
    title: string;
    student: string;
    status: string;
    createdAt: string;
  }>;
  annotations: Array<{
    id: string;
    essayId: string;
    content: string;
    position: { x: number; y: number };
  }>;
}

export const mockData: MockData = {
  professor: {
    token: 'mock-professor-token-123',
    user: {
      id: 'prof-1',
      name: 'Professor Yago Sales',
      email: 'yago@professor.com',
      role: 'professor',
    },
  },
  aluno: {
    token: 'mock-aluno-token-456',
    user: {
      id: 'aluno-1',
      name: 'João Silva',
      email: 'joao@aluno.com',
      role: 'aluno',
    },
  },
  essays: [
    {
      id: 'essay-1',
      title: 'Redação sobre Sustentabilidade',
      student: 'João Silva',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'essay-2',
      title: 'Redação sobre Tecnologia',
      student: 'Maria Santos',
      status: 'graded',
      createdAt: '2024-01-14T14:30:00Z',
    },
  ],
  annotations: [
    {
      id: 'ann-1',
      essayId: 'essay-1',
      content: 'Excelente argumentação!',
      position: { x: 100, y: 200 },
    },
  ],
};

export async function setupMocks(page: Page) {
  // Mock localStorage
  await page.addInitScript((data) => {
    // Mock localStorage methods
    const mockStorage = {
      getItem: (key: string) => {
        if (key === 'token') return data.professor.token;
        if (key === 'role') return data.professor.user.role;
        return null;
      },
      setItem: (key: string, value: string) => {
        console.log(`Mock localStorage.setItem(${key}, ${value})`);
      },
      removeItem: (key: string) => {
        console.log(`Mock localStorage.removeItem(${key})`);
      },
      clear: () => {
        console.log('Mock localStorage.clear()');
      },
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });
  }, mockData);

  // Mock fetch for API calls
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    
    console.log(`Mock API: ${method} ${url}`);
    
    // Mock /auth/me endpoint
    if (url.includes('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData.professor.user),
      });
      return;
    }
    
    // Mock /api/essays endpoint
    if (url.includes('/api/essays')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData.essays),
      });
      return;
    }
    
    // Mock /api/annotations endpoint
    if (url.includes('/api/annotations')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData.annotations),
      });
      return;
    }
    
    // Mock file upload endpoint
    if (url.includes('/api/upload')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://mock-cloudinary.com/sample-pdf.pdf',
          publicId: 'mock-file-id',
        }),
      });
      return;
    }
    
    // Mock health check
    if (url.includes('/api/health')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
      return;
    }
    
    // Default mock response
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mock response' }),
    });
  });
}

export async function setupAlunoMocks(page: Page) {
  // Mock localStorage for aluno
  await page.addInitScript((data) => {
    const mockStorage = {
      getItem: (key: string) => {
        if (key === 'token') return data.aluno.token;
        if (key === 'role') return data.aluno.user.role;
        return null;
      },
      setItem: (key: string, value: string) => {
        console.log(`Mock localStorage.setItem(${key}, ${value})`);
      },
      removeItem: (key: string) => {
        console.log(`Mock localStorage.removeItem(${key})`);
      },
      clear: () => {
        console.log('Mock localStorage.clear()');
      },
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });
  }, mockData);

  // Mock fetch for API calls (same as professor for now)
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    
    console.log(`Mock API: ${method} ${url}`);
    
    // Mock /auth/me endpoint for aluno
    if (url.includes('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData.aluno.user),
      });
      return;
    }
    
    // Mock other endpoints same as professor
    if (url.includes('/api/essays')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData.essays),
      });
      return;
    }
    
    if (url.includes('/api/health')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
      return;
    }
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mock response' }),
    });
  });
}
