import axios from "axios";

// Cấu hình Base URL hỗ trợ cả chạy Local và khi Deploy lên Vercel
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://web-production-0599c.up.railway.app";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});
