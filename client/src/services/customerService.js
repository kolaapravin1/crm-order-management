import api from './api';

export const listCustomers = (params) => api.get('/customers', { params }).then((r) => r.data);
export const getCustomer = (id) => api.get(`/customers/${id}`).then((r) => r.data);
export const createCustomer = (payload) => api.post('/customers', payload).then((r) => r.data);
export const updateCustomer = (id, payload) => api.put(`/customers/${id}`, payload).then((r) => r.data);
