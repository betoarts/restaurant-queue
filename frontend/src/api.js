import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const queueAPI = {
  getAll: () => api.get('/queue').then(r => r.data || []),
  add: (data) => api.post('/queue', data).then(r => r.data),
  updateStatus: (id, status) => api.patch(`/queue/${id}/status`, { status }).then(r => r.data),
  update: (id, data) => api.put(`/queue/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/queue/${id}`).then(r => r.data),
}

export const tablesAPI = {
  getAll: () => api.get('/tables').then(r => r.data || []),
  create: (data) => api.post('/tables', data).then(r => r.data),
  updateStatus: (id, status) => api.patch(`/tables/${id}/status`, { status }).then(r => r.data),
  update: (id, data) => api.put(`/tables/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/tables/${id}`).then(r => r.data),
}

export const notifyAPI = {
  send: (data) => api.post('/notify', data).then(r => r.data),
}

export const messageAPI = {
  send: (data) => api.post('/send-message', data).then(r => r.data),
}

export const statsAPI = {
  get: () => api.get('/stats').then(r => r.data),
}

export const waAPI = {
  status: () => api.get('/whatsapp/status').then(r => r.data),
  qr: () => api.get('/whatsapp/qr').then(r => r.data),
  connect: () => api.post('/whatsapp/connect').then(r => r.data),
  disconnect: () => api.post('/whatsapp/disconnect').then(r => r.data),
  logout: () => api.post('/whatsapp/logout').then(r => r.data),
}

export const historyAPI = {
  getHistory: (params) => api.get('/queue/history', { params }).then(r => r.data || []),
  getDailyReport: (params) => api.get('/reports/daily', { params }).then(r => r.data),
}

export const settingsAPI = {
  getAll: () => api.get('/settings').then(r => r.data),
  update: (data) => api.put('/settings', data).then(r => r.data),
}

export const systemAPI = {
  exportConfig: () => api.get('/system/export').then(r => r.data),
  importConfig: (data) => api.post('/system/import', data).then(r => r.data),
}

export default api
