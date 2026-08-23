import client from './axiosClient';

export const createBooking = (eventId, holdToken) =>
  client.post('/bookings', { eventId, holdToken }).then((r) => r.data.data);

export const listMyBookings = () => client.get('/bookings').then((r) => r.data.data);
export const getBooking = (id) => client.get(`/bookings/${id}`).then((r) => r.data.data);
export const cancelBooking = (id) => client.delete(`/bookings/${id}`).then((r) => r.data.data);
