import { BaseComponent } from '../../component.js';
export class MediaSectionInput extends BaseComponent {
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
    get title() {
        const element = this.element.querySelector('#title');
        return element.value;
    }
    get url() {
        const element = this.element.querySelector('#url');
        return element.value;
    }
}
