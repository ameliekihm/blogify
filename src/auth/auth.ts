const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN;
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI;

export function loginWithGoogle() {
  const redirectUri = encodeURIComponent(COGNITO_REDIRECT_URI);
  const scopes = encodeURIComponent('openid email profile');
  window.location.href =
    `${COGNITO_DOMAIN}/oauth2/authorize?` +
    `client_id=${COGNITO_CLIENT_ID}` +
    `&response_type=code` +
    `&scope=${scopes}` +
    `&redirect_uri=${redirectUri}` +
    `&identity_provider=Google` +
    `&prompt=select_account`;
}

export function logout() {
  localStorage.removeItem('id_token');
  localStorage.removeItem('access_token');
  const logoutUri = window.location.origin;
  window.location.href = `${COGNITO_DOMAIN}/logout?client_id=${COGNITO_CLIENT_ID}&logout_uri=${encodeURIComponent(
    logoutUri
  )}`;
}

export async function saveTokenFromURL() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (code) {
    try {
      const res = await fetch(
        `${API_URL}/auth/callback?code=${code}&redirect_uri=${encodeURIComponent(
          COGNITO_REDIRECT_URI
        )}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      if (res.ok) {
        const { id_token, access_token } = await res.json();
        localStorage.setItem('id_token', id_token);
        localStorage.setItem('access_token', access_token);
        window.history.replaceState({}, document.title, '/');
      } else {
        console.error('Failed to exchange code for token');
      }
    } catch (err) {
      console.error('Auth error', err);
    }
  }
}

export async function getCurrentUser() {
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) return null;

  try {
    const res = await fetch(`${COGNITO_DOMAIN}/oauth2/userInfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('User info error', err);
    return null;
  }
}
