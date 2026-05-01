import axios from "axios";

// Cấu hình Base URL hỗ trợ cả chạy Local và khi Deploy lên Vercel
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});
