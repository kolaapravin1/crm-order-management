import api from './api';

export const listAdmins = () => api.get('/users').then((r) => r.data);
export const createAdmin = (payload) => api.post('/users', payload).then((r) => r.data);
export const updateAdmin = (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data);
export const setAdminStatus = (id, isActive) => api.patch(`/users/${id}/status`, { isActive }).then((r) => r.data);
