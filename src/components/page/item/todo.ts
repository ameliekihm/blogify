import { BaseComponent } from '../../component';
import socket from '../../../socket';

const API_URL = import.meta.env.VITE_API_URL;

export class TodoComponent extends BaseComponent<HTMLElement> {
  private titleEl: HTMLElement;
  private listEl: HTMLElement;
  private editBtn: HTMLButtonElement;
  private postId?: number;
  private editing = false;

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

    socket.on('post-editing', (id: number) => {
      if (id === this.postId) {
        const card = this.element.closest('.page-item') as HTMLElement;
        card?.classList.add('editing');
        this.editBtn.innerHTML = `<i class="fa-solid fa-square-check"></i>`;
      }
    });

    socket.on('post-editing-done', (id: number) => {
      if (id === this.postId) {
        const card = this.element.closest('.page-item') as HTMLElement;
        card?.classList.remove('editing');
        this.editBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i>`;
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
      this.editBtn.innerHTML = `<i class="fa-solid fa-square-check"></i>`;
      socket.emit('post-editing', this.postId);
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
      socket.emit('post-editing-done', this.postId);
      card.classList.remove('editing');
      this.editBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i>`;
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
}
