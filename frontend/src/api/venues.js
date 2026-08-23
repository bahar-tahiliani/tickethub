import client from './axiosClient';

export const listVenues = () => client.get('/venues').then((r) => r.data.data);
export const getVenue = (id) => client.get(`/venues/${id}`).then((r) => r.data.data);
export const createVenue = (payload) => client.post('/venues', payload).then((r) => r.data.data);
export const updateVenue = (id, payload) => client.put(`/venues/${id}`, payload).then((r) => r.data.data);
export const deleteVenue = (id) => client.delete(`/venues/${id}`).then((r) => r.data);
export const createSeatCategory = (venueId, payload) =>
  client.post(`/venues/${venueId}/categories`, payload).then((r) => r.data.data);
export const generateSeatLayout = (venueId, rowCategoryMap) =>
  client.post(`/venues/${venueId}/seats/generate`, { rowCategoryMap }).then((r) => r.data.data);

export const adminStats = () => client.get('/admin/stats').then((r) => r.data.data);
export const adminOrganisers = () => client.get('/admin/organisers').then((r) => r.data.data);
export const adminEvents = () => client.get('/admin/events').then((r) => r.data.data);
export const adminBookings = () => client.get('/admin/bookings').then((r) => r.data.data);
