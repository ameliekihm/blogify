import { BaseComponent } from '../../component.js';
import { MediaData } from '../dialog.js';

export class MediaSectionInput
  extends BaseComponent<HTMLElement>
  implements MediaData
{
  constructor() {
    super(`<div>
                    <div class="form__container">
                        <label for="title">Title</label>
                        <input type="text" id="title" placeholder="Enter a title"/>
                    </div>
                    <div class="form__container">
                        <label for="url">URL</label>
                        <input type="text" id="url" placeholder="Enter an image link or a YouTube link"/>
                    </div>
                </div>`);
  }

  get title(): string {
    const element = this.element.querySelector('#title')! as HTMLInputElement;
    return element.value;
  }
  get url(): string {
    const element = this.element.querySelector('#url')! as HTMLInputElement;
    return element.value;
  }
}
