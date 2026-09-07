import api from './api';

export const getSuperadminSummary = () => api.get('/dashboard/superadmin').then((r) => r.data);
export const getAdminSummary = () => api.get('/dashboard/admin').then((r) => r.data);
