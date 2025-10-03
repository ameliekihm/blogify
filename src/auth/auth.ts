const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function loginWithGoogle() {
  window.location.href = `${API_URL}/auth/google`;
}

export function logout() {
  localStorage.removeItem('token');
  window.location.reload();
}

export function saveTokenFromURL() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    localStorage.setItem('token', token);
    window.history.replaceState({}, document.title, '/');
  }
}

export async function getCurrentUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  const res = await fetch(`${API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  return await res.json();
}
