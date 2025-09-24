import {
  InputDialog,
  MediaData,
  TextData,
} from './components/dialog/dialog.js';
import { MediaSectionInput } from './components/dialog/input/media-input.js';
import { TextSectionInput } from './components/dialog/input/text-input.js';
import { ImageComponent } from './components/page/item/image.js';
import { VideoComponent } from './components/page/item/video.js';
import { NoteComponent } from './components/page/item/note.js';
import { TodoComponent } from './components/page/item/todo.js';
import { PageComponent, PageItemComponent } from './components/page/page.js';
import { Component } from './components/component.js';

type InputComponentConstructor<T = (MediaData | TextData) & Component> = {
  new (): T;
};

class App {
  private readonly page: PageComponent;

  constructor(appRoot: HTMLElement, private dialogRoot: HTMLElement) {
    this.page = new PageComponent(PageItemComponent);
    this.page.attachTo(appRoot);

    this.bindElementToDialog<MediaSectionInput>(
      '#new-image',
      MediaSectionInput,
      (input: MediaSectionInput) => new ImageComponent(input.title, input.url)
    );

    this.bindElementToDialog<MediaSectionInput>(
      '#new-video',
      MediaSectionInput,
      (input: MediaSectionInput) => new VideoComponent(input.title, input.url)
    );

    this.bindElementToDialog<TextSectionInput>(
      '#new-note',
      TextSectionInput,
      (input: TextSectionInput) => new NoteComponent(input.title, input.body)
    );

    this.bindElementToDialog<TextSectionInput>(
      '#new-todo',
      TextSectionInput,
      (input: TextSectionInput) => new TodoComponent(input.title, input.body)
    );

    this.loadPostsFromAPI();
  }

  private bindElementToDialog<T extends (MediaData | TextData) & Component>(
    selector: string,
    InputComponent: InputComponentConstructor<T>,
    makeSection: (input: T) => Component
  ) {
    const element = document.querySelector(selector)! as HTMLButtonElement;
    element.addEventListener('click', () => {
      const dialog = new InputDialog();
      const input = new InputComponent();
      dialog.addChild(input);
      dialog.attachTo(this.dialogRoot);

      dialog.setOnSubmitListener(async () => {
        const post = {
          title: (input as any).title,
          body: (input as any).body ?? (input as any).url ?? '',
        };

        try {
          const savedPost = await this.savePostToAPI(post);
          const section = makeSection(input);
          const item = this.page.addChild(section);
          item.postId = savedPost.id;

          item.setOnCloseListener(async () => {
            if (item.postId) {
              const res = await fetch(
                `http://localhost:4000/api/posts/${item.postId}`,
                {
                  method: 'DELETE',
                }
              );
              if (res.ok) {
                item.removeFrom(this.page['element']);
                this.page['children'].delete(item);
              }
            }
          });
        } catch (err) {
          console.error('Failed to save post:', err);
        }

        dialog.removeFrom(this.dialogRoot);
      });
    });
  }

  private async loadPostsFromAPI() {
    try {
      const res = await fetch('http://localhost:4000/api/posts');
      const posts = await res.json();

      posts.forEach((post: any) => {
        const section = new NoteComponent(post.title, post.body);
        const item = this.page.addChild(section);
        item.postId = post.id;

        item.setOnCloseListener(async () => {
          if (item.postId) {
            const res = await fetch(
              `http://localhost:4000/api/posts/${item.postId}`,
              {
                method: 'DELETE',
              }
            );
            if (res.ok) {
              item.removeFrom(this.page['element']);
              this.page['children'].delete(item);
            }
          }
        });
      });
    } catch (err) {
      console.error('Failed to load posts from API:', err);
    }
  }

  private async savePostToAPI(post: { title: string; body: string }) {
    const res = await fetch('http://localhost:4000/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    return res.json();
  }
}

new App(document.querySelector('.document')! as HTMLElement, document.body);
