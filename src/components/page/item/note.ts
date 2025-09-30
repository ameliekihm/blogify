import { BaseComponent } from '../../component';
import { API_URL } from '../../../config';
import socket from '../../../socket';

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

    socket.on('post-editing', (id: number) => {
      if (id === this.postId) {
        const card = this.element.closest('.page-item') as HTMLElement;
        card?.classList.add('editing');
      }
    });

    socket.on('post-editing-done', (id: number) => {
      if (id === this.postId) {
        const card = this.element.closest('.page-item') as HTMLElement;
        card?.classList.remove('editing');
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

    if (!this.editing) {
      this.titleEl.contentEditable = 'true';
      this.bodyEl.contentEditable = 'true';
      const debouncedTyping = debounce(() => this.emitTyping(), 300);
      this.titleEl.oninput = debouncedTyping;
      this.bodyEl.oninput = debouncedTyping;
      card.classList.add('editing');
      this.editBtn.innerHTML = `<i class="fa-solid fa-square-check"></i>`;
      socket.emit('post-editing', this.postId);
      this.editing = true;
    } else {
      this.titleEl.contentEditable = 'false';
      this.bodyEl.contentEditable = 'false';
      this.titleEl.oninput = null;
      this.bodyEl.oninput = null;
      card.classList.remove('editing');
      this.editBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i>`;
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
      socket.emit('post-editing-done', this.postId);
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
}
