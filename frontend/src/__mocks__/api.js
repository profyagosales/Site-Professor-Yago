const api = {
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
};
const pickData = (r) => (r?.data?.data ?? r?.data ?? r);
const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const loginTeacher = jest.fn(() => Promise.resolve({}));
const loginStudent = jest.fn(() => Promise.resolve({ token: '123', role: 'student' }));
const loginStudentLegacy = jest.fn(() => Promise.resolve({}));
api.loginTeacher = loginTeacher;
api.loginStudent = loginStudent;
api.loginStudentLegacy = loginStudentLegacy;
module.exports = {
  __esModule: true,
  default: api,
  api,
  pickData,
  toArray,
  loginTeacher,
  loginStudent,
  loginStudentLegacy,
};
