import api from './api';

export const listProducts = (all = false) => api.get('/products', { params: { all } }).then((r) => r.data);
export const createProduct = (payload) => api.post('/products', payload).then((r) => r.data);
export const updateProduct = (id, payload) => api.put(`/products/${id}`, payload).then((r) => r.data);
export const deactivateProduct = (id) => api.delete(`/products/${id}`).then((r) => r.data);
