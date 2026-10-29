import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { MARKED_OPTIONS, MarkedOptions, MarkedRenderer, provideMarkdown } from 'ngx-markdown';

const markedOptionsFactory = (): MarkedOptions => {
  const renderer = new MarkedRenderer();
  renderer.link = (link): string =>
    `<a href="${link.href}" target="_blank" rel="noopener noreferrer" ${link.title ? `title="${link.title}"` : ''}>${link.text}</a>`;
  return {
    renderer: renderer,
    gfm: true,
    breaks: true,
    pedantic: false,
  };
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideMarkdown({
      markedOptions: {
        provide: MARKED_OPTIONS,
        useFactory: markedOptionsFactory,
      },
    }),
  ],
};
