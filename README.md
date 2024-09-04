# Blogify 📝
<p align="center">
<img width="888" alt="Screenshot 2024-09-03 at 10 39 25 PM" src="https://github.com/user-attachments/assets/0ed1dac8-31df-452b-975b-66ef7d8901da">
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

**Example**: `BaseComponent Class`

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
