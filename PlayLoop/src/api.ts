import { auth } from './firebase';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function apiFetch(input: string | URL, init: RequestInit = {}) {
  const url = new URL(input, window.location.origin);
  const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin;
  if (url.origin !== apiOrigin || !url.pathname.startsWith('/api/')) throw new Error('Unexpected API destination');
  await auth.authStateReady();
  const headers = new Headers(init.headers);
  if (auth.currentUser) headers.set('Authorization', `Bearer ${await auth.currentUser.getIdToken()}`);
  return fetch(url, { ...init, headers, redirect: 'error' });
}
