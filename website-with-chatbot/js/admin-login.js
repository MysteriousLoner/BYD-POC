'use strict';
document.querySelector('.transport-warning').hidden = location.protocol === 'https:';
document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button'), error = document.getElementById('loginError');
  button.disabled = true; error.textContent = '';
  try {
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Sign in failed.');
    location.assign('/admin');
  } catch (e) { error.textContent = e.message; }
  finally { button.disabled = false; }
});
