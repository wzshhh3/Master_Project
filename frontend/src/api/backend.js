import axios from 'axios';

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axios.post("http://localhost:8000/upload/", formData);
};

export const analyzeGraph = (filename) => {
  return axios.post("http://localhost:8000/analyze/", { filename });
};