const api = {
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
};
export const pickData = (r) => r?.data?.data ?? r?.data ?? r;
export const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
export const ping = jest.fn(() => Promise.resolve(true));
export const loginTeacher = jest.fn(() => Promise.resolve({}));
export const loginStudent = jest.fn(() => Promise.resolve({ token: '123', role: 'student' }));
export const loginStudentLegacy = jest.fn(() => Promise.resolve({}));
api.loginTeacher = loginTeacher;
api.loginStudent = loginStudent;
api.loginStudentLegacy = loginStudentLegacy;
export default api;
export { api };
