export const gradeEssay = jest.fn(() => Promise.resolve({}));
export const fetchEssays = jest.fn(() => Promise.resolve({ items: [], page: 1, pageSize: 10, total: 0 }));
export default { gradeEssay, fetchEssays };