// Setup global antes dos testes
jest.setTimeout(15000);

// Mocks básicos para serviços externos que podem ser importados indiretamente
jest.mock('../../services/cloudinaryService', () => ({
  uploadFile: jest.fn(async (buf, opts) => ({ secure_url: 'https://example.com/fake.pdf', public_id: 'fakeid' }))
}));
