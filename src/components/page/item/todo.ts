import { BaseComponent } from '../../component.js';

export class TodoComponent extends BaseComponent<HTMLElement> {
  private checkbox: HTMLInputElement;

  constructor(
    title: string,
    todo: string,
    done: boolean = false,
    postId?: number
  ) {
    super(`<section class="todo">
            <h2 class="page-item__title todo__title"></h2>
            <input type="checkbox" id="todo-checkbox">
            <label for="todo-checkbox" class="todo-label"></label>
            </section>`);

    const titleElement = this.element.querySelector(
      '.todo__title'
    )! as HTMLHeadElement;
    titleElement.textContent = title;

    const todoElement = this.element.querySelector(
      '.todo-label'
    )! as HTMLLabelElement;
    todoElement.textContent = todo;

    this.checkbox = this.element.querySelector(
      '#todo-checkbox'
    )! as HTMLInputElement;
    this.checkbox.checked = done;

    if (postId) {
      this.checkbox.addEventListener('change', async () => {
        await fetch(`http://localhost:4000/api/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ done: this.checkbox.checked }),
        });
      });
    }
  }
}
