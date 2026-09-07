import api from './api';

export const listCombos = (all = false) => api.get('/combos', { params: { all } }).then((r) => r.data);
export const createCombo = (payload) => api.post('/combos', payload).then((r) => r.data);
export const updateCombo = (id, payload) => api.put(`/combos/${id}`, payload).then((r) => r.data);
export const deactivateCombo = (id) => api.delete(`/combos/${id}`).then((r) => r.data);
