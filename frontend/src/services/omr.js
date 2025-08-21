import api from '@api';

export const uploadPdf = async (pdfFile, onUploadProgress) => {
  const formData = new FormData();
  formData.append('pdf', pdfFile);
  const res = await api.post('/omr/grade', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return res.data;
};

export default {
  uploadPdf,
};
