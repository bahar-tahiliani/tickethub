import client from './axiosClient';

export const listEvents = (params) => client.get('/events', { params }).then((r) => r.data.data);
export const getEvent = (id) => client.get(`/events/${id}`).then((r) => r.data.data);
export const getSeatMap = (id) => client.get(`/events/${id}/seats`).then((r) => r.data.data);
export const createEvent = (payload) => client.post('/events', payload).then((r) => r.data.data);
export const updateEvent = (id, payload) => client.put(`/events/${id}`, payload).then((r) => r.data.data);
export const deleteEvent = (id) => client.delete(`/events/${id}`).then((r) => r.data);
export const myEvents = () => client.get('/events/mine/list').then((r) => r.data.data);
export const revenueSummary = () => client.get('/events/mine/revenue').then((r) => r.data.data);
export const eventBookings = (id) => client.get(`/events/${id}/bookings`).then((r) => r.data.data);
