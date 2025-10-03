import {
  loginWithGoogle,
  logout,
  saveTokenFromURL,
  getCurrentUser,
} from '../auth/auth';
import socket from '../socket';

function getRandomAvatar() {
  const avatars = [
    '/assets/default-avatar1.jpg',
    '/assets/default-avatar2.jpg',
    '/assets/default-avatar3.jpg',
    '/assets/default-avatar4.jpg',
    '/assets/default-avatar5.jpg',
    '/assets/default-avatar6.jpg',
    '/assets/default-avatar7.jpg',
  ];
  const idx = Math.floor(Math.random() * avatars.length);
  return avatars[idx];
}

export async function initAuthHeader() {
  saveTokenFromURL();

  const user = await getCurrentUser();
  const header = document.querySelector('#auth-header') as HTMLElement;
  if (!header) return;

  if (user) {
    (window as any).currentUser = {
      name: user.firstName,
      photo: user.photo,
    };

    header.innerHTML = '';

    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.textContent = 'Logout';

    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';

    const img = document.createElement('img');
    img.src = user.photo || getRandomAvatar();
    img.width = 32;
    img.height = 32;
    img.onerror = () => {
      img.src = getRandomAvatar();
    };

    const span = document.createElement('span');
    span.textContent = user.firstName;

    userInfo.appendChild(img);
    userInfo.appendChild(span);

    header.appendChild(logoutBtn);
    header.appendChild(userInfo);

    logoutBtn.addEventListener('click', () => {
      const editingPosts: Set<number> =
        (window as any).currentEditingPosts || new Set();
      editingPosts.forEach((postId) => {
        socket.emit('post-editing-done', {
          id: postId,
          user: (window as any).currentUser || {
            name: 'Guest',
            photo: getRandomAvatar(),
          },
        });
      });
      (window as any).currentEditingPosts = new Set();

      logout();
      (window as any).currentUser = null;
      console.log('logout, currentUser=', (window as any).currentUser);
    });
  } else {
    (window as any).currentUser = null;

    header.innerHTML = '';

    const loginBtn = document.createElement('button');
    loginBtn.id = 'login-btn';
    loginBtn.textContent = 'Login';

    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';

    const img = document.createElement('img');
    img.src = getRandomAvatar();
    img.width = 32;
    img.height = 32;

    const labels = document.createElement('div');
    labels.className = 'guest-labels';

    const span = document.createElement('span');
    span.className = 'guest-name';
    span.textContent = 'Guest';

    const small = document.createElement('small');
    small.textContent = '(viewer)';

    labels.appendChild(span);
    labels.appendChild(small);

    userInfo.appendChild(img);
    userInfo.appendChild(labels);

    header.appendChild(loginBtn);
    header.appendChild(userInfo);

    loginBtn.addEventListener('click', loginWithGoogle);
  }
}
