import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor - add token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const { refreshToken, updateToken, logout } = useAuthStore.getState()

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken })
          const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data
          updateToken(newAccess, newRefresh)
          originalRequest.headers.Authorization = `Bearer ${newAccess}`
          return api(originalRequest)
        } catch {
          logout()
          window.location.href = '/login'
          return Promise.reject(error)
        }
      } else {
        logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  updateProfile: (data) => api.patch('/auth/update-profile', data),
  changePassword: (data) => api.patch('/auth/change-password', data)
}

// Cases
export const casesApi = {
  getAll: (params) => api.get('/cases', { params }),
  getOne: (id) => api.get(`/cases/${id}`),
  create: (data) => api.post('/cases', data),
  update: (id, data) => api.patch(`/cases/${id}`, data),
  addNote: (id, data) => api.post(`/cases/${id}/notes`, data),
  addHearing: (id, data) => api.post(`/cases/${id}/hearings`, data),
  assignMember: (id, data) => api.post(`/cases/${id}/assignments`, data)
}

// Clients
export const clientsApi = {
  getAll: (params) => api.get('/clients', { params }),
  getOne: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.patch(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`)
}

// Tasks
export const tasksApi = {
  getAll: (params) => api.get('/tasks', { params }),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`)
}

// Documents
export const documentsApi = {
  getAll: (params) => api.get('/documents', { params }),
  upload: (formData) => api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/documents/${id}`)
}

// Billing
export const billingApi = {
  getInvoices: (params) => api.get('/billing/invoices', { params }),
  getInvoice: (id) => api.get(`/billing/invoices/${id}`),
  createInvoice: (data) => api.post('/billing/invoices', data),
  updateInvoiceStatus: (id, status) => api.patch(`/billing/invoices/${id}/status`, { status }),
  sendInvoice: (id, data) => api.post(`/billing/invoices/${id}/send`, data),
  recordPayment: (data) => api.post('/billing/payments', data),
  getPayments: (params) => api.get('/billing/payments', { params }),
  getPaymentReceipt: (id) => api.get(`/billing/payments/${id}/receipt`),
  sendPaymentReceipt: (id, data) => api.post(`/billing/payments/${id}/send-receipt`, data),
  getExpenses: (params) => api.get('/billing/expenses', { params }),
  addExpense: (data) => api.post('/billing/expenses', data),
  getTimeEntries: (params) => api.get('/billing/time-entries', { params }),
  addTimeEntry: (data) => api.post('/billing/time-entries', data)
}

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats')
}

// Reports
export const reportsApi = {
  getFinancial: (params) => api.get('/reports/financial', { params }),
  getCases: () => api.get('/reports/cases'),
  getDetailed: (params) => api.get('/reports/detailed', { params })
}

// Users
export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data)
}

// Notifications
export const notificationsApi = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all')
}

// Tenant
export const tenantApi = {
  getCurrent: () => api.get('/tenants/current'),
  updateSettings: (data) => api.patch('/tenants/settings', data),
  getAuditLogs: (params) => api.get('/tenants/audit-logs', { params })
}

// Messages
export const messagesApi = {
  getAll: (params) => api.get('/communications/messages', { params }),
  send: (data) => api.post('/communications/messages', data)
}

// Superadmin
export const superAdminApi = {
  getStats: () => api.get('/superadmin/stats'),
  // Tenants
  listTenants: (params) => api.get('/superadmin/tenants', { params }),
  getTenant: (id) => api.get(`/superadmin/tenants/${id}`),
  createTenant: (data) => api.post('/superadmin/tenants', data),
  updateTenant: (id, data) => api.patch(`/superadmin/tenants/${id}`, data),
  activateTenant: (id) => api.post(`/superadmin/tenants/${id}/activate`),
  deactivateTenant: (id) => api.post(`/superadmin/tenants/${id}/deactivate`),
  deleteTenant: (id) => api.delete(`/superadmin/tenants/${id}`),
  // Users
  listTenantUsers: (tenantId) => api.get(`/superadmin/tenants/${tenantId}/users`),
  setUserPassword: (userId, password) => api.patch(`/superadmin/users/${userId}/password`, { password }),
  toggleUserActive: (userId) => api.patch(`/superadmin/users/${userId}/toggle-active`),
}
