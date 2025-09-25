import { BaseComponent, Component } from '../component.js';
export type { MediaData } from './input/media-input.js';
export type { TextData } from './input/text-input.js';

type OnCloseListener = () => void;
type OnSubmitListener = () => void;

export class InputDialog extends BaseComponent<HTMLElement> {
  private closeListener?: OnCloseListener;
  private submitListener?: OnSubmitListener;

  constructor(submitText: string = 'Add') {
    super(`<section class="dialog">
             <div class="dialog__container">
               <button class="dialog__close">&times;</button>
               <div id="dialog__body"></div>
               <button class="dialog__submit">${submitText}</button>
             </div>
           </section>`);

    const closeBtn = this.element.querySelector(
      '.dialog__close'
    )! as HTMLButtonElement;
    closeBtn.onclick = () => {
      this.removeFrom(document.body);
      this.closeListener && this.closeListener();
    };

    const submitBtn = this.element.querySelector(
      '.dialog__submit'
    )! as HTMLButtonElement;
    submitBtn.onclick = () => {
      this.submitListener && this.submitListener();
    };
  }

  setOnCloseListener(listener: OnCloseListener) {
    this.closeListener = listener;
  }

  setOnSubmitListener(listener: OnSubmitListener) {
    this.submitListener = listener;
  }

  setSubmitLabel(label: string) {
    const submitBtn = this.element.querySelector(
      '.dialog__submit'
    )! as HTMLButtonElement;
    submitBtn.textContent = label;
  }

  addChild(child: Component) {
    const body = this.element.querySelector('#dialog__body')! as HTMLElement;
    child.attachTo(body);
  }
}
