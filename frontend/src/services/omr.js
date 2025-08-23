import { api, pickData } from '@/lib/http';

export const uploadPdf = (pdfFile, onUploadProgress) => {
  const formData = new FormData();
  formData.append('pdf', pdfFile);
  return api
    .post('/omr/grade', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
    .then(pickData);
};

export default {
  uploadPdf,
};

