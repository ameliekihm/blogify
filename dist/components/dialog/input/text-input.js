import { BaseComponent } from '../../component.js';
export class TextSectionInput extends BaseComponent {
    constructor() {
        super(`<div>
                    <div class="form__container">
                        <label for="title">Title</label>
                        <input type="text" id="title" placeholder="Enter a title"/>
                    </div>
                    <div class="form__container">
                        <label for="body">Body</label>
                        <textarea type="text" row="3" id="body" placeholder="Enter the details here"></textarea>
                    </div>
                </div>`);
    }
    get title() {
        const element = this.element.querySelector('#title');
        return element.value;
    }
    get body() {
        const element = this.element.querySelector('#body');
        return element.value;
    }
}
