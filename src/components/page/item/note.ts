import { BaseComponent } from '../../component';
import { API_URL } from '../../../config';
import socket from '../../../socket';
import { showPopup } from '../popup';

const userColors = new Map<string, string>();
const palette = [
  '#f9b9b2ff',
  '#badef7ff',
  '#c6e9d4ff',
  '#e5c9f0ff',
  '#f5e3c6ff',
  '#bee8dfff',
];

function getUserColor(userId: string) {
  if (!userColors.has(userId)) {
    const color = palette[Math.floor(Math.random() * palette.length)];
    userColors.set(userId, color);
  }
  return userColors.get(userId)!;
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export class NoteComponent extends BaseComponent<HTMLElement> {
  private titleEl: HTMLElement;
  private bodyEl: HTMLElement;
  private editBtn: HTMLButtonElement;
  private postId?: number;
  private editing = false;
  private editingUsers = new Map<string, any>();
  private badgesEl?: HTMLElement;

  constructor(title: string, body: string, postId?: number) {
    super(`
      <div>
        <h2 class="note__title"></h2>
        <p class="note__body"></p>
        <button class="edit-btn"><i class="fa-solid fa-pen-to-square"></i></button>
      </div>
    `);
    this.titleEl = this.element.querySelector('.note__title')!;
    this.bodyEl = this.element.querySelector('.note__body')!;
    this.editBtn = this.element.querySelector('.edit-btn')!;
    this.postId = postId;

    this.titleEl.innerHTML = title;
    this.bodyEl.innerHTML = body;

    this.editBtn.onclick = () => this.toggleEdit();

    if (this.postId) {
      this.element
        .closest('.page-item')
        ?.setAttribute('data-id', String(this.postId));
    }

    socket.on('post-editing', (data: any) => {
      if (data.id === this.postId) {
        const card = this.element.closest('.page-item') as HTMLElement;
        card?.classList.add('editing');
        this.editingUsers.set(data.socketId, data.user);
        this.updateBadges();
      }
    });

    socket.on('post-editing-done', (data: any) => {
      if (data.id === this.postId) {
        const card = this.element.closest('.page-item') as HTMLElement;
        card?.classList.remove('editing');
        this.editingUsers.delete(data.socketId);
        this.updateBadges();
      }
    });

    socket.on('post-typing', (data: any) => {
      if (data.id === this.postId && !this.editing) {
        this.titleEl.innerHTML = data.title;
        this.bodyEl.innerHTML = data.body;
      }
    });
  }

  private toggleEdit() {
    if (!this.postId) return;
    const card = this.element.closest('.page-item') as HTMLElement;
    if (!card) return;

    const currentUser = (window as any).currentUser;
    if (!currentUser) {
      showPopup('Log in to start editing');
      return;
    }

    if (!this.editing) {
      this.titleEl.contentEditable = 'true';
      this.bodyEl.contentEditable = 'true';
      const debouncedTyping = debounce(() => this.emitTyping(), 300);
      this.titleEl.oninput = debouncedTyping;
      this.bodyEl.oninput = debouncedTyping;
      card.classList.add('editing');
      this.editBtn.querySelector('i')!.className = 'fa-solid fa-square-check';

      socket.emit('post-editing', {
        id: this.postId,
        user: currentUser,
      });

      if (!(window as any).currentEditingPosts) {
        (window as any).currentEditingPosts = new Set();
      }
      (window as any).currentEditingPosts.add(this.postId);

      this.editing = true;
    } else {
      this.titleEl.contentEditable = 'false';
      this.bodyEl.contentEditable = 'false';
      this.titleEl.oninput = null;
      this.bodyEl.oninput = null;
      card.classList.remove('editing');
      this.editBtn.querySelector('i')!.className = 'fa-solid fa-pen-to-square';

      const updated = {
        title: this.titleEl.innerHTML || '',
        body: this.bodyEl.innerHTML || '',
      };
      fetch(`${API_URL}/api/posts/${this.postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
        .then((r) => r.json())
        .then((post) => socket.emit('post-updated', post));

      socket.emit('post-editing-done', {
        id: this.postId,
        user: currentUser,
      });

      if ((window as any).currentEditingPosts) {
        (window as any).currentEditingPosts.delete(this.postId);
      }

      this.editing = false;
    }
  }

  private emitTyping() {
    if (!this.postId) return;
    socket.emit('post-typing', {
      id: this.postId,
      title: this.titleEl.innerHTML,
      body: this.bodyEl.innerHTML,
    });
  }

  private updateBadges() {
    if (!this.badgesEl) {
      this.badgesEl = document.createElement('div');
      this.badgesEl.className = 'editing-badges';
      const card = this.element.closest('.page-item') as HTMLElement;
      if (card) card.appendChild(this.badgesEl);
    }
    this.badgesEl.innerHTML = '';

    const users = Array.from(this.editingUsers.values());
    const maxVisible = 2;

    users.slice(0, maxVisible).forEach((user) => {
      const badge = document.createElement('div');
      badge.className = 'badge-circle';
      badge.innerText = user.name ? user.name.charAt(0).toUpperCase() : '?';
      badge.title = `${user.name} is editing…`;

      const color = getUserColor(user.name);
      badge.style.backgroundColor = color;

      this.badgesEl!.appendChild(badge);
    });

    if (users.length > maxVisible) {
      const more = document.createElement('div');
      more.className = 'badge-circle';
      more.innerText = `+${users.length - maxVisible}`;
      more.title = users
        .slice(maxVisible)
        .map((u) => `${u.name} is editing…`)
        .join('\n');
      more.style.backgroundColor = '#fbd3f1ff';
      this.badgesEl!.appendChild(more);
    }
  }
}
