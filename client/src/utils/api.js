// src/utils/api.js
// Centralized Axios API client with auth interceptors

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('leanaxis_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('leanaxis_token');
      localStorage.removeItem('leanaxis_user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (login, password) => api.post('/auth/login', { login, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// ── Generic CRUD factory ──────────────────────────────────────────────────────
function crudAPI(resource) {
  return {
    getAll: () => api.get(`/${resource}`),
    getById: (id) => api.get(`/${resource}/${id}`),
    create: (data) => api.post(`/${resource}`, data),
    update: (id, data) => api.put(`/${resource}/${id}`, data),
    delete: (id) => api.delete(`/${resource}/${id}`),
  };
}

// ── Resource APIs ─────────────────────────────────────────────────────────────
export const clientsAPI = crudAPI('clients');
export const vendorsAPI = crudAPI('vendors');
export const expensesAPI = crudAPI('expenses');
export const pettyCashAPI = crudAPI('petty-cash');
export const salariesAPI = crudAPI('salaries');
export const bankRecordsAPI = crudAPI('bank-records');
export const quotationsAPI = crudAPI('quotations');

// ── Invoices (extended) ───────────────────────────────────────────────────────
export const invoicesAPI = {
  ...crudAPI('invoices'),
  recordPayment: (id, data) => api.post(`/invoices/${id}/payment`, data),
  generateRecurring: () => api.post('/invoices/generate-recurring'),
};

// ── Vendor Bills (extended) ───────────────────────────────────────────────────
export const vendorBillsAPI = {
  ...crudAPI('vendor-bills'),
  recordPayment: (id, data) => api.post(`/vendor-bills/${id}/payment`, data),
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const usersAPI = {
  ...crudAPI('users'),
};

// ── Settings & Data Management ────────────────────────────────────────────────
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  uploadLogo: (base64Image, imgbbKey) => api.post('/settings/upload-logo', { base64Image, imgbbKey }),
  exportData: () => api.get('/settings/export'),
  importData: (data) => api.post('/settings/import', data),
  generateRecurringExpenses: () => api.post('/settings/generate-recurring-expenses'),
  convertQuote: (id) => api.post(`/settings/convert-quote/${id}`),
};

export default api;
