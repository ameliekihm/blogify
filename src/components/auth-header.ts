import {
  loginWithGoogle,
  logout,
  saveTokenFromURL,
  getCurrentUser,
} from '../auth/auth';

export async function initAuthHeader() {
  saveTokenFromURL();

  const user = await getCurrentUser();
  const header = document.querySelector('#auth-header') as HTMLElement;
  if (!header) return;

  if (user) {
    header.innerHTML = `
      <img src="${user.photo}" width="24" height="24" style="border-radius:50%; margin-right:8px;">
      <span>${user.firstName} ${user.lastName}</span>
      <button id="logout-btn">Logout</button>
    `;
    document.querySelector('#logout-btn')?.addEventListener('click', logout);
  } else {
    header.innerHTML = `<button id="login-btn">Login with Google</button>`;
    document
      .querySelector('#login-btn')
      ?.addEventListener('click', loginWithGoogle);
  }
}
