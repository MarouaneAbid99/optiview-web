import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'optiview_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
};

export const panoramaAPI = {
  getStores: () => client.get('/panorama/stores'),
  getStore: (id) => client.get(`/panorama/stores/${id}`),
  createStore: (data) => client.post('/panorama/stores', data),
  updateStore: (id, data) => client.put(`/panorama/stores/${id}`, data),
  deleteStore: (id) => client.delete(`/panorama/stores/${id}`),

  getHotspots: (storeId) => client.get(`/panorama/hotspots/store/${storeId}`),
  createHotspot: (data) => client.post('/panorama/hotspots', data),
  updateHotspot: (id, data) => client.put(`/panorama/hotspots/${id}`, data),
  deleteHotspot: (id) => client.delete(`/panorama/hotspots/${id}`),
};

export const clientsAPI = {
  getClients: (search = '') => client.get('/clients', { params: search ? { search } : {} }),
  getClientById: (id) => client.get(`/clients/${id}`),
  createClient: (data) => client.post('/clients', data),
  updateClient: (id, data) => client.put(`/clients/${id}`, data),
  deleteClient: (id) => client.delete(`/clients/${id}`),
  getStats: () => client.get('/clients/stats'),

  addPrescription: (clientId, data) => client.post(`/clients/${clientId}/prescriptions`, data),
  getPrescriptions: (clientId) => client.get(`/clients/${clientId}/prescriptions`),
  deletePrescription: (id) => client.delete(`/clients/prescriptions/${id}`),

  addAppointment: (clientId, data) => client.post(`/clients/${clientId}/appointments`, data),
  getAppointments: (clientId) => client.get(`/clients/${clientId}/appointments`),
  updateAppointmentStatus: (clientId, appointmentId, status) =>
    client.put(`/clients/${clientId}/appointments/${appointmentId}`, { status }),
  deleteAppointment: (clientId, appointmentId) =>
    client.delete(`/clients/${clientId}/appointments/${appointmentId}`),
};

export const eyewearAPI = {
  getFrames: (brand = '', category = '') =>
    client.get('/eyewear/frames', {
      params: { ...(brand && { brand }), ...(category && { category }) },
    }),
  getFrameById: (id) => client.get(`/eyewear/frames/${id}`),
  createFrame: (data) => client.post('/eyewear/frames', data),
  updateFrame: (id, data) => client.put(`/eyewear/frames/${id}`, data),
  updateStock: (id, stock) => client.put(`/eyewear/frames/${id}/stock`, { stock }),
  deleteFrame: (id) => client.delete(`/eyewear/frames/${id}`),
  getBrands: () => client.get('/eyewear/brands'),
  getCategories: () => client.get('/eyewear/categories'),
  getStats: () => client.get('/eyewear/frames/stats'),
  getLowStockFrames: (threshold = 5) =>
    client.get('/eyewear/frames/low-stock', { params: { threshold } }),
};

export const lensesAPI = {
  getLenses: (type = '', material = '') =>
    client.get('/lenses', {
      params: { ...(type && { type }), ...(material && { material }) },
    }),
  getLensById: (id) => client.get(`/lenses/${id}`),
  createLens: (data) => client.post('/lenses', data),
  updateLens: (id, data) => client.put(`/lenses/${id}`, data),
  updateStock: (id, stock) => client.put(`/lenses/${id}/stock`, { stock }),
  deleteLens: (id) => client.delete(`/lenses/${id}`),
  getTypes: () => client.get('/lenses/types'),
  getMaterials: () => client.get('/lenses/materials'),
  getStats: () => client.get('/lenses/stats'),
  getLowStockLenses: (threshold = 10) =>
    client.get('/lenses/low-stock', { params: { threshold } }),
};

export const atelierAPI = {
  getOrders: (params = {}) => client.get('/atelier/orders', { params }),
  getKanban: () => client.get('/atelier/orders/kanban'),
  getStats: () => client.get('/atelier/orders/stats'),
  getOrderById: (id) => client.get(`/atelier/orders/${id}`),
  createOrder: (data) => client.post('/atelier/orders', data),
  updateStatus: (id, status) => client.put(`/atelier/orders/${id}/status`, { status }),
  updateOrder: (id, data) => client.put(`/atelier/orders/${id}`, data),
  deleteOrder: (id) => client.delete(`/atelier/orders/${id}`),
};

export const usersAPI = {
  listEmployees: () => client.get('/users/employees'),
  createEmployee: (data) => client.post('/users/employees', data),
  setEmployeeActive: (id, active) => client.patch(`/users/employees/${id}/active`, { active }),
  deleteEmployee: (id) => client.delete(`/users/employees/${id}`),

  listOpticians: () => client.get('/users/opticians'),
  createOptician: (data) => client.post('/users/opticians', data),
  listShops: () => client.get('/users/shops'),
  setShopActive: (id, active) => client.patch(`/users/shops/${id}/active`, { active }),
};

export default client;
