import { BaseComponent } from '../../component';
import socket from '../../../socket';

const API_URL = import.meta.env.VITE_API_URL;
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

export class TodoComponent extends BaseComponent<HTMLElement> {
  private titleEl: HTMLElement;
  private listEl: HTMLElement;
  private editBtn: HTMLButtonElement;
  private postId?: number;
  private editing = false;
  private editingUsers = new Map<string, any>();
  private badgesEl?: HTMLElement;

  constructor(
    title: string,
    body: string,
    _done: boolean,
    postId?: number,
    checks?: boolean[]
  ) {
    super(`
      <div>
        <h2 class="todo__title"></h2>
        <div class="todo__list"></div>
        <button class="edit-btn"><i class="fa-solid fa-pen-to-square"></i></button>
      </div>
    `);
    this.titleEl = this.element.querySelector('.todo__title')!;
    this.listEl = this.element.querySelector('.todo__list')!;
    this.editBtn = this.element.querySelector('.edit-btn')!;
    this.postId = postId;

    this.titleEl.innerHTML = title;
    this.renderBody(body, checks);

    this.editBtn.onclick = () => this.toggleEdit();

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
        this.renderBody(data.body, data.checks);
      }
    });

    socket.on('post-updated', (data: any) => {
      if (data.id === this.postId && !this.editing) {
        this.titleEl.innerHTML = data.title;
        this.renderBody(data.body, data.checks);
      }
    });
  }

  private renderBody(body: any, checks?: boolean[]) {
    this.listEl.innerHTML = '';
    const text = typeof body === 'string' ? body : '';
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      this.addRow(line, checks ? checks[idx] : false);
    });
  }

  private addRow(text: string, checked: boolean) {
    const row = document.createElement('div');
    row.className = 'todo__row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo__check';
    checkbox.checked = checked;
    const line = document.createElement('span');
    line.className = 'todo__line';
    line.contentEditable = String(this.editing);
    line.innerText = text;
    row.appendChild(checkbox);
    row.appendChild(line);
    this.listEl.appendChild(row);

    line.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newRow = this.addRow('', false);
        const newLine = newRow.querySelector('.todo__line') as HTMLElement;
        newLine.focus();
        this.emitTyping();
      }
    });

    line.addEventListener('input', () => {
      this.emitTyping();
    });

    checkbox.onchange = () => {
      if (!this.postId) return;
      const newBody = Array.from(this.listEl.querySelectorAll('.todo__line'))
        .map((line) => (line as HTMLElement).innerText)
        .join('\n');
      const checks = Array.from(
        this.listEl.querySelectorAll('.todo__check')
      ).map((c) => (c as HTMLInputElement).checked);
      const updated = {
        id: this.postId,
        title: this.titleEl.innerText,
        body: newBody,
        checks,
      };
      socket.emit('post-updated', updated);
      fetch(`${API_URL}/api/posts/${this.postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    };

    return row;
  }

  private toggleEdit() {
    if (!this.postId) return;
    const card = this.element.closest('.page-item') as HTMLElement;
    if (!card) return;

    if (!this.editing) {
      this.editing = true;
      this.titleEl.contentEditable = 'true';
      this.listEl.querySelectorAll('.todo__line').forEach((line) => {
        (line as HTMLElement).contentEditable = 'true';
        line.addEventListener('input', () => this.emitTyping());
      });
      card.classList.add('editing');
      this.editBtn.querySelector('i')!.className = 'fa-solid fa-square-check';

      socket.emit('post-editing', {
        id: this.postId,
        user: (window as any).currentUser || {
          name: 'Guest',
          photo: '/default-avatar.jpg',
        },
      });

      if (!(window as any).currentEditingPosts) {
        (window as any).currentEditingPosts = new Set();
      }
      (window as any).currentEditingPosts.add(this.postId);
    } else {
      this.editing = false;
      this.titleEl.contentEditable = 'false';
      this.listEl.querySelectorAll('.todo__line').forEach((line) => {
        (line as HTMLElement).contentEditable = 'false';
      });
      const newBody = Array.from(this.listEl.querySelectorAll('.todo__line'))
        .map((line) => (line as HTMLElement).innerText)
        .join('\n');
      const checks = Array.from(
        this.listEl.querySelectorAll('.todo__check')
      ).map((c) => (c as HTMLInputElement).checked);
      const updated = {
        id: this.postId,
        title: this.titleEl.innerText,
        body: newBody,
        checks,
      };
      socket.emit('post-updated', updated);
      fetch(`${API_URL}/api/posts/${this.postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      socket.emit('post-editing-done', {
        id: this.postId,
        user: (window as any).currentUser || {
          name: 'Guest',
          photo: '/default-avatar.jpg',
        },
      });

      if ((window as any).currentEditingPosts) {
        (window as any).currentEditingPosts.delete(this.postId);
      }

      card.classList.remove('editing');
      this.editBtn.querySelector('i')!.className = 'fa-solid fa-pen-to-square';
    }
  }

  private emitTyping() {
    if (!this.postId) return;
    const newBody = Array.from(this.listEl.querySelectorAll('.todo__line'))
      .map((line) => (line as HTMLElement).innerText)
      .join('\n');
    const checks = Array.from(this.listEl.querySelectorAll('.todo__check')).map(
      (c) => (c as HTMLInputElement).checked
    );
    socket.emit('post-typing', {
      id: this.postId,
      title: this.titleEl.innerText,
      body: newBody,
      checks,
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
      more.style.backgroundColor = '#7f8c8d';
      this.badgesEl!.appendChild(more);
    }
  }
}
