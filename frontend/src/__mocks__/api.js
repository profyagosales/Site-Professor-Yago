const api = {
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
};
const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
module.exports = { __esModule: true, default: api, api, toArray };
