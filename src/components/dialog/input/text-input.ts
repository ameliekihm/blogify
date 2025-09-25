import { BaseComponent } from '../../component.js';

export interface TextData {
  title: string;
  body: string;
}

export class TextSectionInput
  extends BaseComponent<HTMLElement>
  implements TextData
{
  constructor() {
    super(`<div>
      <div class="form__container">
        <label for="title">Title</label>
        <input type="text" id="title" placeholder="Enter a title"/>
      </div>
      <div class="form__container">
        <label for="body">Body</label>
        <textarea id="body" rows="3" placeholder="Enter the details here"></textarea>
      </div>
    </div>`);
  }

  get title(): string {
    return (this.element.querySelector('#title')! as HTMLInputElement).value;
  }

  get body(): string {
    return (this.element.querySelector('#body')! as HTMLTextAreaElement).value;
  }
}
