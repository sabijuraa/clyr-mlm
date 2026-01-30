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
  // Public endpoints
  getAll: (params = {}) => 
    api.get('/products', { params }),

  getFeatured: (limit = 4) => 
    api.get('/products/featured', { params: { limit } }),

  getNew: (limit = 4) => 
    api.get('/products/new', { params: { limit } }),

  getCategories: () => 
    api.get('/products/categories'),

  getByCategory: (slug, params = {}) => 
    api.get(`/products/category/${slug}`, { params }),

  getBySlug: (slug) => 
    api.get(`/products/slug/${slug}`),

  getById: (id) => 
    api.get(`/products/${id}`),

  // Admin endpoints
  getAllAdmin: (params = {}) => 
    api.get('/products/admin/all', { params }),

  getStats: () => 
    api.get('/products/admin/stats'),

  create: (formData) => 
    api.post('/products/admin', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  update: (id, formData) => 
    api.put(`/products/admin/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  delete: (id) => 
    api.delete(`/products/admin/${id}`),

  toggleActive: (id) => 
    api.patch(`/products/admin/${id}/toggle-active`),

  toggleFeatured: (id) => 
    api.patch(`/products/admin/${id}/toggle-featured`),

  updateStock: (id, data) => 
    api.patch(`/products/admin/${id}/stock`, data),

  bulkUpdate: (productIds, updates) => 
    api.post('/products/admin/bulk-update', { productIds, updates }),

  uploadImage: (id, formData) => 
    api.post(`/products/admin/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  deleteImage: (id, imageIndex) => 
    api.delete(`/products/admin/${id}/image/${imageIndex}`)
};

// ============ ORDERS API ============

export const ordersAPI = {
  // Public
  calculate: (items, country, hasVatId = false) => 
    api.post('/orders/calculate', { items, country, hasVatId }),

  createPaymentIntent: (amount, metadata = {}) => 
    api.post('/orders/create-payment-intent', { amount, metadata }),

  create: (orderData) => 
    api.post('/orders', orderData),

  getConfirmation: (orderNumber) => 
    api.get(`/orders/confirmation/${orderNumber}`),

  // Partner - referred orders
  getMyReferrals: (params = {}) => 
    api.get('/orders/my-referrals', { params }),

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
    api.post('/partners/payout-request', { amount }),

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
    api.get('/commissions', { params }),

  getSummary: () => 
    api.get('/commissions/summary'),

  getStatement: (period) => 
    api.get(`/commissions/statement/${period}`, { responseType: 'blob' }),

  // Admin
  getAll: (params = {}) => 
    api.get('/commissions/all', { params }),

  getPending: () => 
    api.get('/commissions/pending'),

  release: () => 
    api.post('/commissions/release'),

  processPayouts: (dryRun = false) => 
    api.post('/commissions/process-payouts', { dryRun })
};

// ============ PAYOUTS API ============

export const payoutsAPI = {
  // Partner
  getMy: (params = {}) => 
    api.get('/payouts/my', { params }),

  request: () => 
    api.post('/payouts/request'),

  getDetails: (id) => 
    api.get(`/payouts/${id}`),

  downloadStatement: (id) => 
    api.get(`/payouts/${id}/statement`, { responseType: 'blob' }),

  // Admin
  getPending: () => 
    api.get('/payouts/admin/pending'),

  getEligible: () => 
    api.get('/payouts/admin/eligible'),

  getStats: () => 
    api.get('/payouts/admin/stats'),

  approve: (id) => 
    api.post(`/payouts/admin/${id}/approve`),

  cancel: (id, reason) => 
    api.post(`/payouts/admin/${id}/cancel`, { reason }),

  complete: (id) => 
    api.post(`/payouts/admin/${id}/complete`),

  process: () => 
    api.post('/payouts/admin/process'),

  runCycle: () => 
    api.post('/payouts/admin/run-cycle')
};

// ============ SUBSCRIPTIONS API ============

export const subscriptionsAPI = {
  // Customer
  getMy: () => 
    api.get('/subscriptions/my'),

  cancel: (id) => 
    api.post(`/subscriptions/${id}/cancel`),

  pause: (id) => 
    api.post(`/subscriptions/${id}/pause`),

  resume: (id) => 
    api.post(`/subscriptions/${id}/resume`),

  // Admin
  getAll: (params = {}) => 
    api.get('/subscriptions/admin/all', { params }),

  getDue: () => 
    api.get('/subscriptions/admin/due'),

  getStats: () => 
    api.get('/subscriptions/admin/stats'),

  runRenewals: () => 
    api.post('/subscriptions/admin/run-renewals')
};

// ============ ACADEMY API ============

export const academyAPI = {
  // Partner
  getContent: () => 
    api.get('/academy'),

  getProgress: () => 
    api.get('/academy/progress'),

  getContentItem: (slug) => 
    api.get(`/academy/content/${slug}`),

  updateProgress: (contentId, progress) => 
    api.post(`/academy/progress/${contentId}`, { progress }),

  markComplete: (contentId) => 
    api.post(`/academy/complete/${contentId}`),

  // Admin
  getAllContent: () => 
    api.get('/academy/admin/all'),

  createContent: (data) => 
    api.post('/academy/admin/content', data),

  updateContent: (id, data) => 
    api.put(`/academy/admin/content/${id}`, data),

  deleteContent: (id) => 
    api.delete(`/academy/admin/content/${id}`),

  getPartnerProgress: (partnerId) => 
    api.get(`/academy/admin/partner/${partnerId}/progress`)
};

// ============ STOCK API ============

export const stockAPI = {
  getLevels: () => 
    api.get('/stock/levels'),

  getAlerts: () => 
    api.get('/stock/alerts'),

  getMovements: (productId, params = {}) => 
    api.get(`/stock/movements/${productId}`, { params }),

  adjust: (productId, quantity, type, notes) => 
    api.post(`/stock/adjust/${productId}`, { quantity, type, notes }),

  updateThreshold: (productId, threshold) => 
    api.patch(`/stock/threshold/${productId}`, { threshold }),

  bulkImport: (items) => 
    api.post('/stock/bulk-import', { items })
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
