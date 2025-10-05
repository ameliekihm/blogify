const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'local'; // "local" | "cognito"

// Cognito domain & client info (EKS)
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN;
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI;

export function loginWithGoogle() {
  if (AUTH_MODE === 'local') {
    // local
    window.location.href = `${API_URL}/auth/google`;
  } else {
    // Cognito Hosted UI
    const redirectUri = encodeURIComponent(COGNITO_REDIRECT_URI);
    const scopes = encodeURIComponent('openid email profile');
    window.location.href = `${COGNITO_DOMAIN}/oauth2/authorize?client_id=${COGNITO_CLIENT_ID}&response_type=token&scope=${scopes}&redirect_uri=${redirectUri}`;
  }
}

export function logout() {
  localStorage.removeItem('token');
  window.location.reload();
}

export function saveTokenFromURL() {
  const params = new URLSearchParams(window.location.hash.substring(1)); // Cognito implicit flow → hash fragment
  let token = params.get('id_token');

  // fallback: local
  if (!token) {
    const queryParams = new URLSearchParams(window.location.search);
    token = queryParams.get('token');
  }

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
