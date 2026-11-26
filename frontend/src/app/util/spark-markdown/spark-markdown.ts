import {
  Component,
  InjectionToken,
  Signal,
  ViewEncapsulation,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { MarkdownComponent, MarkdownService, MarkedRenderer } from 'ngx-markdown';
import { MarkdownLibraries } from '../markdown-libs';

const SPARK_MARKDOWN_SERVICE = new InjectionToken<MarkdownService>('Spark MarkdownService', {
  providedIn: 'root',
  factory: () => {
    const renderer = new MarkedRenderer();
    renderer.link = (link): string =>
      `<a href="${link.href}" target="_blank" rel="noopener noreferrer" ${link.title ? `title="${link.title}"` : ''}>${link.text}</a>`;
    const service = new MarkdownService();
    service.options = { renderer, gfm: true, breaks: true, pedantic: false };
    return service;
  },
});

function markdownPlugin(needed: Signal<boolean>, load: () => Promise<void>, name: string) {
  return resource({
    params: () => (needed() ? true : undefined),
    loader: async () => {
      try {
        await load();
        return true;
      } catch (error) {
        console.warn(`Could not load the ${name} markdown plugin. Rendering without it.`, error);
        return false;
      }
    },
  });
}

@Component({
  imports: [MarkdownComponent],
  selector: 'app-spark-markdown',
  styleUrl: './spark-markdown.css',
  templateUrl: './spark-markdown.html',
  // The library inserts HTML at runtime, so it will not have Angular's style attributes.
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: MarkdownService, useExisting: SPARK_MARKDOWN_SERVICE }],
})
export class SparkMarkdown {
  data = input.required<string>();
  clipboard = input<boolean | ''>(false);

  private readonly needsMermaid = computed(
    () =>
      /(?:`{3,}|~{3,})[ \t]*mermaid[ \t]*\r?$/m.test(this.data()) ||
      /<[\w-]+\b[^>]*\bclass\s*=\s*["'][^"']*\bmermaid\b[^"']*["']/i.test(this.data()),
  );
  private readonly needsEmoji = computed(() => /:[a-z0-9_+-]+:/i.test(this.data()));

  private readonly libraries = inject(MarkdownLibraries);
  protected readonly mermaid = markdownPlugin(
    this.needsMermaid,
    () => this.libraries.loadMermaid(),
    'Mermaid',
  );
  protected readonly emoji = markdownPlugin(
    this.needsEmoji,
    () => this.libraries.loadEmoji(),
    'Emoji',
  );
}
