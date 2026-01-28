import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
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
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`,
            { refreshToken }
          );

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============ AUTH API ============

export const authAPI = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),

  register: (formData) => 
    api.post('/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    return api.post('/auth/logout', { refreshToken });
  },

  refreshToken: (refreshToken) => 
    api.post('/auth/refresh-token', { refreshToken }),

  getCurrentUser: () => 
    api.get('/auth/me'),

  updateProfile: (data) => 
    api.put('/auth/update-profile', data),

  changePassword: (currentPassword, newPassword) => 
    api.put('/auth/change-password', { currentPassword, newPassword }),

  forgotPassword: (email) => 
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token, newPassword) => 
    api.post('/auth/reset-password', { token, newPassword }),

  checkReferralCode: (code) => 
    api.get(`/auth/check-referral/${code}`),
  
  checkSetup: () =>
    api.get('/auth/check-setup'),
  
  setupAdmin: (data) =>
    api.post('/auth/setup-admin', data)
};

// ============ PRODUCTS API ============

export const productsAPI = {
  getAll: (params = {}) => 
    api.get('/products', { params }),

  getFeatured: (limit = 4) => 
    api.get('/products/featured', { params: { limit } }),

  getBySlug: (slug) => 
    api.get(`/products/${slug}`),

  getCategories: () => 
    api.get('/products/categories'),

  getByCategory: (slug, params = {}) => 
    api.get(`/products/category/${slug}`, { params }),

  // Admin
  create: (formData) => 
    api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  update: (id, formData) => 
    api.put(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  delete: (id) => 
    api.delete(`/products/${id}`),

  updateStock: (id, stock) => 
    api.patch(`/products/${id}/stock`, { stock })
};

// ============ ORDERS API ============

export const ordersAPI = {
  calculate: (items, country, hasVatId = false) => 
    api.post('/orders/calculate-totals', { items, country, hasVatId }),

  createPaymentIntent: (amount, metadata = {}) => 
    api.post('/orders/payment-intent', { amount, metadata }),

  create: (orderData) => 
    api.post('/orders', orderData),

  getConfirmation: (orderNumber) => 
    api.get(`/orders/confirmation/${orderNumber}`),

  // Partner - referred orders
  getMyReferrals: (params = {}) => 
    api.get('/orders/partner/referred', { params }),

  // Admin
  getAll: (params = {}) => 
    api.get('/orders', { params }),

  getById: (id) => 
    api.get(`/orders/${id}`),

  updateStatus: (id, status, trackingNumber = null, adminNotes = null) => 
    api.patch(`/orders/${id}/status`, { status, trackingNumber, adminNotes }),

  refund: (id, reason, amount = null) => 
    api.post(`/orders/${id}/refund`, { reason, amount }),

  getInvoice: (id) => 
    api.get(`/orders/${id}/invoice`, { responseType: 'blob' })
};

// ============ PARTNER API ============

export const partnerAPI = {
  getDashboard: () => 
    api.get('/partners/dashboard'),

  getTeam: (params = {}) => 
    api.get('/partners/team', { params }),

  getTeamTree: (maxDepth = 5) => 
    api.get('/partners/team/tree', { params: { maxDepth } }),

  getTeamMember: (id) => 
    api.get(`/partners/team/${id}`),

  getReferralLinks: () => 
    api.get('/partners/referral-links'),

  createReferralLink: (data) => 
    api.post('/partners/referral-links', data),

  getReferralStats: () => 
    api.get('/partners/referral-stats'),

  getCustomers: (params = {}) => 
    api.get('/partners/customers', { params }),

  getWallet: () => 
    api.get('/partners/wallet'),

  requestPayout: (amount = null) => 
    api.post('/partners/wallet/payout', { amount }),

  getPayoutHistory: (params = {}) => 
    api.get('/partners/payouts', { params }),

  getRankProgress: () => 
    api.get('/partners/rank-progress'),

  getActivity: (params = {}) => 
    api.get('/partners/activity', { params })
};

// ============ COMMISSIONS API ============

export const commissionsAPI = {
  getMy: (params = {}) => 
    api.get('/commissions/my', { params }),

  getSummary: () => 
    api.get('/commissions/summary'),

  getStatement: (period) => 
    api.get(`/commissions/statement/${period}`, { responseType: 'blob' }),

  // Admin
  getAll: (params = {}) => 
    api.get('/commissions', { params }),

  getPending: () => 
    api.get('/commissions/pending'),

  release: () => 
    api.post('/commissions/release'),

  processPayouts: (dryRun = false) => 
    api.post('/commissions/process-payouts', { dryRun })
};

// ============ ADMIN API ============

export const adminAPI = {
  getDashboard: () => 
    api.get('/admin/dashboard'),

  // Partners
  getPartners: (params = {}) => 
    api.get('/admin/partners', { params }),

  getPartnerById: (id) => 
    api.get(`/admin/partners/${id}`),

  updatePartnerStatus: (id, status, reason = null) => 
    api.patch(`/admin/partners/${id}/status`, { status, reason }),

  updatePartnerRank: (id, rankId, reason = null) => 
    api.patch(`/admin/partners/${id}/rank`, { rankId, reason }),

  // Settings
  getSettings: () => 
    api.get('/admin/settings'),

  updateSetting: (key, value) => 
    api.put(`/admin/settings/${key}`, { value }),

  // Branding Settings
  getBranding: () =>
    api.get('/admin/settings/branding'),

  updateBranding: (brandingData) =>
    api.put('/admin/settings/branding', brandingData),

  uploadLogo: (formData) =>
    api.post('/admin/settings/branding/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // Reports
  getSalesReport: (params = {}) => 
    api.get('/admin/reports/sales', { params }),

  getCommissionsReport: (params = {}) => 
    api.get('/admin/reports/commissions', { params }),

  getPartnersReport: () => 
    api.get('/admin/reports/partners'),

  // Exports
  exportOrders: (params = {}) => 
    api.get('/admin/export/orders', { params, responseType: 'blob' }),

  exportCommissions: (params = {}) => 
    api.get('/admin/export/commissions', { params, responseType: 'blob' }),

  // Activity
  getActivity: (params = {}) => 
    api.get('/admin/activity', { params })
};

// ============ BRANDING API (Public) ============

export const brandingAPI = {
  get: () => api.get('/branding')
};

// ============ UTILITY FUNCTIONS ============

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default api;
