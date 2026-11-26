import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, Injectable, provideBrowserGlobalErrorListeners } from '@angular/core';
import { PreloadingStrategy, Route, provideRouter, withPreloading } from '@angular/router';
import { Observable, catchError, of } from 'rxjs';
import { routes } from './app.routes';

@Injectable({ providedIn: 'root' })
class RoomPreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return route.data?.['preload'] ? load().pipe(catchError(() => of(null))) : of(null);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(RoomPreloadStrategy)),
    provideHttpClient(),
  ],
};
