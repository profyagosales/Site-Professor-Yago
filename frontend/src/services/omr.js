import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const uploadPdf = async (pdfFile, onUploadProgress) => {
  const formData = new FormData();
  formData.append('pdf', pdfFile);
  const res = await axios.post(`${API_URL}/omr/grade`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return res.data;
};

export default {
  uploadPdf,
};
