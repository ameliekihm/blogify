export interface Component {
  attachTo(parent: HTMLElement, position?: InsertPosition): void;
  removeFrom(parent: HTMLElement): void;
  attach(component: Component, position?: InsertPosition): void;
}

export class BaseComponent<T extends HTMLElement> implements Component {
  protected readonly root: T;

  constructor(htmlString: string) {
    const template = document.createElement('template');
    template.innerHTML = htmlString;
    this.root = template.content.firstElementChild! as T;
  }

  get element(): T {
    return this.root;
  }

  attachTo(parent: HTMLElement, position: InsertPosition = 'afterbegin') {
    parent.insertAdjacentElement(position, this.root);
  }

  removeFrom(parent: HTMLElement) {
    if (this.root.parentElement === parent) {
      parent.removeChild(this.root);
    }
  }

  attach(component: Component, position?: InsertPosition) {
    component.attachTo(this.root, position);
  }
}
