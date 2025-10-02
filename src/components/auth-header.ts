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
      <button id="logout-btn">Logout</button>
      <div class="user-info">
        <img src="${user.photo}" width="32" height="32" />
        <span>${user.firstName}</span>
      </div>
    `;
    document.querySelector('#logout-btn')?.addEventListener('click', logout);
  } else {
    header.innerHTML = `
  <button id="login-btn">Login</button>
  <div class="user-info">
    <img src="/assets/default-avatar.jpg" width="32" height="32" />
    <div class="guest-labels">
      <span class="guest-name">Guest</span>
      <small>(viewer)</small>
    </div>
  </div>
`;

    document
      .querySelector('#login-btn')
      ?.addEventListener('click', loginWithGoogle);
  }
}
