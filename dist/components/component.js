export class BaseComponent {
    constructor(htmlString) {
        const template = document.createElement('template');
        template.innerHTML = htmlString;
        this.element = template.content.firstElementChild;
    }
    attachTo(parent, position = 'afterbegin') {
        parent.insertAdjacentElement(position, this.element);
    }
    removeFrom(parent) {
        if (parent != this.element.parentElement) {
            throw new Error('Parent mismatched!');
        }
        parent.removeChild(this.element);
    }
    attach(component, position) {
        component.attachTo(this.element, position);
    }
}
