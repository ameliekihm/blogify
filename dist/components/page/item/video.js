import { BaseComponent } from '../../component.js';
export class VideoComponent extends BaseComponent {
    constructor(title, url) {
        super(`<section class="video">
            <div class="video__player">
                <iframe class="video__iframe"></iframe>
            </div>
            <h2 class="page-item__title video__title"></h2>
            </section>`);
        const iframe = this.element.querySelector('.video__iframe');
        iframe.src = this.convertToEmbeddedURL(url);
        const titleElement = this.element.querySelector('.video__title');
        titleElement.textContent = title;
    }
    convertToEmbeddedURL(url) {
        const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:(?:youtube.com\/(?:(?:watch\?v=)|(?:embed\/))([a-zA-Z0-9-]{11}))|(?:youtu.be\/([a-zA-Z0-9-]{11})))/;
        const match = url.match(regExp);
        const videoId = match ? match[1] || match[2] : undefined;
        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
        return url;
    }
}
