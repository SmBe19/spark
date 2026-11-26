import { Injectable } from '@angular/core';
import type mermaid from 'mermaid';
import type joypixels from 'emoji-toolkit';

type MarkdownGlobals = Window & {
  mermaid?: typeof mermaid;
  joypixels?: typeof joypixels;
};

@Injectable({ providedIn: 'root' })
export class MarkdownLibraries {
  private mermaidPromise?: Promise<void>;
  private emojiPromise?: Promise<void>;

  loadMermaid(): Promise<void> {
    return (this.mermaidPromise ??= import('mermaid').then(({ default: library }) => {
      (window as MarkdownGlobals).mermaid = library;
    }));
  }

  loadEmoji(): Promise<void> {
    return (this.emojiPromise ??= import('emoji-toolkit').then(({ default: library }) => {
      (window as MarkdownGlobals).joypixels = library;
    }));
  }
}
