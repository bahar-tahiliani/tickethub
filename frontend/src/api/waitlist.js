import client from './axiosClient';

export const joinWaitlist = (eventId, categoryId, quantity = 1) =>
  client.post('/waitlist', { eventId, categoryId, quantity }).then((r) => r.data.data);

export const myWaitlist = () => client.get('/waitlist/mine').then((r) => r.data.data);

export const getWaitlistOffer = (token) => client.get(`/waitlist/offer/${token}`).then((r) => r.data.data);
