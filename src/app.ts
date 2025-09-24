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
      'image'
    );

    this.bindElementToDialog<MediaSectionInput>(
      '#new-video',
      MediaSectionInput,
      'video'
    );

    this.bindElementToDialog<TextSectionInput>(
      '#new-note',
      TextSectionInput,
      'note'
    );

    this.bindElementToDialog<TextSectionInput>(
      '#new-todo',
      TextSectionInput,
      'todo'
    );

    this.loadPostsFromAPI();
  }

  private bindElementToDialog<T extends (MediaData | TextData) & Component>(
    selector: string,
    InputComponent: InputComponentConstructor<T>,
    type: string
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
          type,
        };

        try {
          const savedPost = await this.savePostToAPI(post);
          let section: Component;
          if (type === 'todo') {
            section = new TodoComponent(
              savedPost.title,
              savedPost.body,
              savedPost.done,
              savedPost.id
            );
          } else if (type === 'image') {
            section = new ImageComponent(savedPost.title, savedPost.body);
          } else if (type === 'video') {
            section = new VideoComponent(savedPost.title, savedPost.body);
          } else {
            section = new NoteComponent(savedPost.title, savedPost.body);
          }

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
        let section: Component;
        if (post.type === 'image') {
          section = new ImageComponent(post.title, post.body);
        } else if (post.type === 'video') {
          section = new VideoComponent(post.title, post.body);
        } else if (post.type === 'todo') {
          section = new TodoComponent(
            post.title,
            post.body,
            post.done,
            post.id
          );
        } else {
          section = new NoteComponent(post.title, post.body);
        }

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

  private async savePostToAPI(post: {
    title: string;
    body: string;
    type: string;
  }) {
    const res = await fetch('http://localhost:4000/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    return res.json();
  }
}

new App(document.querySelector('.document')! as HTMLElement, document.body);
