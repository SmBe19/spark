import { Routes } from '@angular/router';
import { JoinRoom } from './room/join-room/join-room';

export const routes: Routes = [
  {
    path: '',
    component: JoinRoom,
    title: 'Spark: Join Room',
  },
  {
    path: 'room/:roomSlug',
    loadComponent: () => import('./room/room-client/room-client').then((m) => m.RoomClient),
    data: { preload: true },
    title: 'Spark',
  },
  {
    path: 'presenter/:roomSlug',
    loadComponent: () =>
      import('./room/room-presenter/room-presenter').then((m) => m.RoomPresenter),
    title: 'Spark',
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin-wrapper/admin-wrapper').then((m) => m.AdminWrapper),
    title: 'Spark: Admin',
  },
];
