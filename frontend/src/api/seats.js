import client from './axiosClient';

export const holdSeats = (eventId, seatCodes) =>
  client.post('/seats/hold', { eventId, seatCodes }).then((r) => r.data.data);

export const releaseSeats = (holdToken) =>
  client.post('/seats/release', { holdToken }).then((r) => r.data.data);
