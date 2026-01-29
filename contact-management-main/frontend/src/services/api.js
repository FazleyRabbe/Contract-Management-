import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.put(`/auth/reset-password/${token}`, data),
};

// Contract API
export const contractAPI = {
  getAll: (params) => api.get('/contracts', { params }),
  getById: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  delete: (id) => api.delete(`/contracts/${id}`),
  submit: (id) => api.post(`/contracts/${id}/submit`),
  approve: (id) => api.post(`/contracts/${id}/approve`),
  reject: (id, data) => api.post(`/contracts/${id}/reject`, data),
  getHistory: (id) => api.get(`/contracts/${id}/history`),
  getStats: () => api.get('/contracts/stats'),

  // Service provider requests
  getRequests: (contractId) => api.get(`/contracts/${contractId}/requests`),
  createRequest: (contractId, data) => api.post(`/contracts/${contractId}/requests`, data),
  acceptRequest: (requestId, data) => api.post(`/contracts/requests/${requestId}/accept`, data),
  rejectRequest: (requestId, data) => api.post(`/contracts/requests/${requestId}/reject`, data),
  withdrawRequest: (requestId) => api.post(`/contracts/requests/${requestId}/withdraw`),

  // Reviews
  submitReview: (contractId, data) => api.post(`/contracts/${contractId}/review`, data),
};

// Service Provider API
export const serviceProviderAPI = {
  getAll: (params) => api.get('/service-providers', { params }),
  getById: (id) => api.get(`/service-providers/${id}`),
  getMyRequests: () => api.get('/service-providers/my-requests'),
  getStats: () => api.get('/service-providers/stats'),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id, data) => api.put(`/admin/users/${id}/status`, data),
  createAdminUser: (data) => api.post('/admin/users', data),
  createUserWithRole: (data) => api.post('/admin/users/create', data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getReports: (params) => api.get('/admin/reports', { params }),
  // Final approval workflow
  getPendingFinalApproval: (params) => api.get('/admin/final-approval/contracts', { params }),
  getContractForFinalApproval: (id) => api.get(`/admin/final-approval/contracts/${id}`),
  finalApprove: (id) => api.post(`/admin/final-approval/contracts/${id}/approve`),
  finalReject: (id, data) => api.post(`/admin/final-approval/contracts/${id}/reject`, data),
};

// Procurement Manager API
export const procurementAPI = {
  getContracts: (params) => api.get('/procurement/contracts', { params }),
  approve: (id) => api.post(`/procurement/contracts/${id}/approve`),
  reject: (id, data) => api.post(`/procurement/contracts/${id}/reject`, data),
  getStats: () => api.get('/procurement/stats'),
  getClients: (params) => api.get('/procurement/clients', { params }),
  createContract: (data) => api.post('/procurement/contracts', data),
};

// Legal Counsel API
export const legalAPI = {
  getContracts: (params) => api.get('/legal/contracts', { params }),
  approve: (id) => api.post(`/legal/contracts/${id}/approve`),
  reject: (id, data) => api.post(`/legal/contracts/${id}/reject`, data),
  getStats: () => api.get('/legal/stats'),
};

// Contract Coordinator API
export const coordinatorAPI = {
  getContracts: (params) => api.get('/coordinator/contracts', { params }),
  getContract: (id) => api.get(`/coordinator/contracts/${id}`),
  getContractOffers: (id, params) => api.get(`/coordinator/contracts/${id}/offers`, { params }),
  selectOffer: (contractId, offerId, data) => api.post(`/coordinator/contracts/${contractId}/select-offer/${offerId}`, data),
  getOfferDetails: (id) => api.get(`/coordinator/offers/${id}`),
  getStats: () => api.get('/coordinator/stats'),
};

export default api;
