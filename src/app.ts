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
import { API_URL } from './config';
import { io, Socket } from 'socket.io-client';

type InputComponentConstructor<T = (MediaData | TextData) & Component> = {
  new (): T;
};

class App {
  private readonly page: PageComponent;
  private socket: Socket;

  constructor(appRoot: HTMLElement, private dialogRoot: HTMLElement) {
    this.page = new PageComponent(PageItemComponent);
    this.page.attachTo(appRoot);
    this.socket = io(API_URL, { transports: ['websocket'] });
    this.socket.on('connect', () => {
      console.log(`Connected to backend: ${this.socket.id}`);
    });
    this.socket.on('post-added', (post) => this.renderPost(post));
    this.socket.on('post-updated', (post) => this.updateRenderedPost(post));
    this.socket.on('post-deleted', (postId) => this.removeRenderedPost(postId));
    this.socket.on('post-editing', (postId: number) => {
      const item = Array.from(this.page['children']).find(
        (child: any) => child.postId === postId
      ) as PageItemComponent | undefined;
      if (item) item['element'].classList.add('editing');
    });
    this.socket.on('post-editing-done', (postId: number) => {
      const item = Array.from(this.page['children']).find(
        (child: any) => child.postId === postId
      ) as PageItemComponent | undefined;
      if (item) item['element'].classList.remove('editing');
    });
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
      const dialog = new InputDialog('Add');
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
          this.socket.emit('post-added', savedPost);
        } catch (err) {
          console.error('Failed to save post:', err);
        }
        dialog.removeFrom(this.dialogRoot);
      });
    });
  }

  private renderPost(post: any) {
    let section: any;
    if (post.type === 'todo') {
      section = new TodoComponent(post.title, post.body, post.done, post.id);
    } else if (post.type === 'image') {
      section = new ImageComponent(post.title, post.body);
    } else if (post.type === 'video') {
      section = new VideoComponent(post.title, post.body);
    } else {
      section = new NoteComponent(post.title, post.body, post.id);
    }
    const item = this.page.addChild(section);
    item.postId = post.id;

    if (post.type === 'note' || post.type === 'todo') {
      const enableEdit = (section as any).enableEdit;
      if (enableEdit) {
        const editBtn = item['element'].querySelector(
          '.edit-btn'
        ) as HTMLButtonElement;
        if (editBtn) editBtn.onclick = () => (section as any).enableEdit();
      }
    } else {
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i>`;
      editBtn.onclick = () => this.openEditDialog(post, item);
      item['element'].appendChild(editBtn);
    }

    item.setOnCloseListener(async () => {
      if (item.postId) {
        const res = await fetch(`${API_URL}/api/posts/${item.postId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          item.removeFrom(this.page['element']);
          this.page['children'].delete(item);
          this.socket.emit('post-deleted', post.id);
        }
      }
    });
  }

  private updateRenderedPost(post: any) {
    const item = Array.from(this.page['children']).find(
      (child: any) => child.postId === post.id
    ) as PageItemComponent | undefined;
    if (item && item.updateContent) {
      item.updateContent(post.title, post.body);
    }
  }

  private removeRenderedPost(postId: number) {
    const item = Array.from(this.page['children']).find(
      (child: any) => child.postId === postId
    ) as PageItemComponent | undefined;
    if (item) {
      item.removeFrom(this.page['element']);
      this.page['children'].delete(item);
    }
  }

  private openEditDialog(post: any, item: PageItemComponent) {
    const dialog = new InputDialog('Done');
    let input: any;
    input = new MediaSectionInput();
    const titleEl = input.element.querySelector('#title') as HTMLInputElement;
    const urlEl = input.element.querySelector('#url') as HTMLInputElement;
    if (titleEl) titleEl.value = post.title;
    if (urlEl) urlEl.value = post.body;
    dialog.addChild(input);
    dialog.attachTo(this.dialogRoot);
    dialog.setSubmitLabel('Done');
    dialog.setOnSubmitListener(async () => {
      const updatedPost = {
        title: (input as any).title,
        body: (input as any).url,
      };
      try {
        const res = await fetch(`${API_URL}/api/posts/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedPost),
        });
        const newPost = await res.json();
        post.title = newPost.title;
        post.body = newPost.body;
        if (item.updateContent) {
          item.updateContent(newPost.title, newPost.body);
        }
        this.socket.emit('post-updated', newPost);
      } catch (err) {
        console.error('Failed to update post:', err);
      }
      dialog.removeFrom(this.dialogRoot);
    });
  }

  private async loadPostsFromAPI() {
    try {
      const res = await fetch(`${API_URL}/api/posts`);
      const posts = await res.json();
      posts.forEach((post: any) => this.renderPost(post));
    } catch (err) {
      console.error('Failed to load posts from API:', err);
    }
  }

  private async savePostToAPI(post: {
    title: string;
    body: string;
    type: string;
  }) {
    const res = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    return res.json();
  }
}

new App(document.querySelector('.document')! as HTMLElement, document.body);
