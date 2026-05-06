const BASE_URL = process.env.REACT_APP_API_URL || "https://web-production-0599c.up.railway.app";
export const API_BASE = `${BASE_URL}/api`;
export const APP_URL = BASE_URL;

// Wrapper around fetch that automatically includes JWT token
export const fetchAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...options, headers });
  
  // If unauthorized, auto-logout
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
  
  return response;
};
