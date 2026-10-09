// This script loads before the existing admin to secure and redirect its API calls.
const nativeFetch = window.fetch.bind(window);
const adminSession = nativeFetch('/api/admin/session').then(async response => {
  if (!response.ok) { location.assign('/admin/login'); throw new Error('Please sign in.'); }
  return response.json();
});
window.fetch = async (url, options = {}) => {
  if (typeof url !== 'string' || !url.startsWith('/api/')) return nativeFetch(url, options);
  const session = await adminSession;
  if (url.startsWith('/api/content')) url = url.replace('/api/content', '/api/admin/content');
  const headers = new Headers(options.headers || {});
  if (options.method && options.method !== 'GET') headers.set('X-CSRF-Token', session.csrf);
  const response = await nativeFetch(url, { ...options, headers });
  if (response.status === 401) location.assign('/admin/login');
  return response;
};
