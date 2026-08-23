import client from './axiosClient';

export const register = (payload) => client.post('/auth/register', payload).then((r) => r.data.data);
export const login = (payload) => client.post('/auth/login', payload).then((r) => r.data.data);
export const logout = () => client.post('/auth/logout').then((r) => r.data);
export const fetchMe = () => client.get('/auth/me').then((r) => r.data.data.user);
