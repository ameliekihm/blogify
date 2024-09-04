# Blogify 📝
<p align="center">
<img width="871" alt="git file" src="https://github.com/user-attachments/assets/4f01d582-8f5f-46b6-88b4-caa675e76291">
</p>


## Project Overview

**Blogify** is a TypeScript-based web application built to create and manage various types of content (images, videos, notes, to-do lists) using modern programming paradigms. 

The project highlights advanced TypeScript features, such as Object-Oriented Programming (OOP), type safety, module-based architecture, and event-driven interactions.

## Features

- **Content Management**: Users can add, remove, and organize content such as images, videos, notes, and to-do lists.
  
- **Drag-and-Drop Functionality**: Fully integrated drag-and-drop interactions to rearrange content dynamically.
  
- **OOP Design**: Built on object-oriented principles, ensuring scalability, modularity, and clean code structure.
  
- **Event-Driven Architecture**: Custom event handling for user interactions like drag, drop, and deletion of content.
  
- **TypeScript Enhancements**:
  - **Strong typing** for functions, objects, and components.
    
  - **Generics** for reusable and flexible code structures.
    
  - **Interfaces and Type Aliases** to define contracts for various components.
    
  - **Custom types** to handle state management and interactions with drag-and-drop.



## Technologies Used

- **TypeScript**: For its static typing, OOP features, and support for type safety across the application.
  
- **HTML/CSS**: For structure and styling.
  
- **Drag-and-Drop API**: For user interactions and organizing content.
  
- **Event Handling**: Custom event listeners for managing user interactions and state changes.


## Architecture and Key Concepts

### 1. Class-Based Components

Each feature of the application is broken into modular components using TypeScript classes. This allows for scalable design and clean separation of concerns.

**Example**: `BaseComponent` Class

```typescript
export abstract class BaseComponent<T extends HTMLElement> implements Component {
  protected readonly element: T;

  constructor(htmlString: string) {
    const template = document.createElement('template');
    template.innerHTML = htmlString;
    this.element = template.content.firstElementChild! as T;
  }

  attachTo(parent: HTMLElement, position: InsertPosition = 'afterbegin') {
    parent.insertAdjacentElement(position, this.element);
  }
}
```
- **Abstract classes** allow us to define base behaviors, enabling us to extend specific behaviors in child classes (e.g., `PageItemComponent`, `TodoComponent`).
  
- **Type safety** with generics ensures that each `BaseComponent` handles a specific `HTMLElement` type.

### 2. Interface-Driven Design

Interfaces define clear contracts for components, making sure that different parts of the application interact correctly.

**Example**: `Composable` Interface

```typescript
export interface Composable {
  addChild(child: Component): void;
}
```
- This allows **components** to compose other components dynamically, ensuring flexibility across different sections of the app.

### 3. Generics for Reusability

Generics allow us to create reusable and flexible components. For example, we use a generic `OnDragStateListener` to handle drag-and-drop events for multiple types of content.

**Example**: Drag and Drop with Generics

```typescript
type OnDragStateListener<T extends Component> = (target: T, state: DragState) => void;

export class PageItemComponent extends BaseComponent<HTMLElement> implements SectionContainer {
  private dragStateListener?: OnDragStateListener<PageItemComponent>;

  setOnDragStateListener(listener: OnDragStateListener<PageItemComponent>) {
    this.dragStateListener = listener;
  }

  notifyDragObservers(state: DragState) {
    this.dragStateListener && this.dragStateListener(this, state);
  }
}
```
- By parameterizing the listener type with `<T extends Component>`, we ensure that our drag-and-drop interactions remain flexible and type-safe across various components.

### 4. Event-Driven Interactions

The drag-and-drop functionality relies heavily on custom event listeners, which handle various stages of the drag-and-drop process, ensuring smooth interactivity.

**Example**: Custom Event Handling for Drag and Drop

```typescript
onDragStart(_: DragEvent) {
  this.notifyDragObservers('start');
}

onDragEnd(_: DragEvent) {
  this.notifyDragObservers('stop');
}

notifyDragObservers(state: DragState) {
  this.dragStateListener && this.dragStateListener(this, state);
}
```
- This structure ensures that the components can react appropriately to user actions.

### 5. Strong Typing with TypeScript

Strong typing with TypeScript ensures fewer runtime errors, better code readability, and more predictable function outputs.

**Example**: Custom Types for State Management

```typescript
type DragState = 'start' | 'stop' | 'enter' | 'leave';
```
- The `DragState` type defines the various states a drag-and-drop interaction can be in, allowing the rest of the app to respond appropriately to these changes.

## Contributing
Contributions to the **Blogify** project are welcome. If you'd like to contribute, please fork the repository, make your changes, and submit a pull request.


