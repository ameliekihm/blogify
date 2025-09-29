import { BaseComponent } from '../../component';
import { API_URL } from '../../../config';
import socket from '../../../socket';

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

    this.titleEl.textContent = title;
    this.bodyEl.textContent = body;

    this.editBtn.onclick = () => this.toggleEdit();
  }

  private toggleEdit() {
    if (!this.postId) return;

    const card = this.element.closest('.page-item') as HTMLElement;
    if (!card) return;

    if (!this.editing) {
      this.titleEl.contentEditable = 'true';
      this.bodyEl.contentEditable = 'true';
      card.classList.add('editing');
      this.editBtn.innerHTML = `<i class="fa-solid fa-square-check"></i>`;
      socket.emit('post-editing', this.postId);
      this.editing = true;
    } else {
      this.titleEl.contentEditable = 'false';
      this.bodyEl.contentEditable = 'false';
      card.classList.remove('editing');
      this.editBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i>`;
      const updated = {
        title: this.titleEl.textContent || '',
        body: this.bodyEl.textContent || '',
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
}
