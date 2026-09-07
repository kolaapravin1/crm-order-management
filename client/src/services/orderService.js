import api from "./api";

export const listOrders = (params) =>
  api.get("/orders", { params }).then((r) => r.data);
export const getOrder = (id) => api.get(`/orders/${id}`).then((r) => r.data);
export const createOrder = (payload) =>
  api.post("/orders", payload).then((r) => r.data);
export const updateOrder = (id, payload) =>
  api.put(`/orders/${id}`, payload).then((r) => r.data);
export const updateStage = (id, workflowStage) =>
  api.patch(`/orders/${id}/stage`, { workflowStage }).then((r) => r.data);
export const deleteOrder = (id, reason) =>
  api.delete(`/orders/${id}`, { data: { reason } }).then((r) => r.data);
export const updatePaymentStatus = (id, paymentStatus) =>
  api.patch(`/orders/${id}/payment`, { paymentStatus }).then((r) => r.data);

export const uploadPhotoFiles = (id, files) => {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append("files", f));
  return api
    .patch(`/orders/${id}/photo-verification/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const setPhotoVerificationStatus = (id, status, notes) =>
  api
    .patch(`/orders/${id}/photo-verification/status`, { status, notes })
    .then((r) => r.data);

export const uploadDesignVersion = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .patch(`/orders/${id}/design/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const updateProduction = (id, status, notes) =>
  api.patch(`/orders/${id}/production`, { status, notes }).then((r) => r.data);

export const updateQC = (id, status, reason) =>
  api.patch(`/orders/${id}/qc`, { status, reason }).then((r) => r.data);

export const updatePacking = (id) =>
  api.patch(`/orders/${id}/packing`, {}).then((r) => r.data);

export const updateTracking = (id, payload) =>
  api.patch(`/orders/${id}/tracking`, payload).then((r) => r.data);

export const getPublicOrder = (token) =>
  api.get(`/public/orders/${token}`).then((r) => r.data);
export const submitCustomerApproval = (token, decision, comment) =>
  api
    .post(`/public/orders/${token}/approval`, { decision, comment })
    .then((r) => r.data);
