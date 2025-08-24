import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
  timeout: 20000,
});

export default http;
