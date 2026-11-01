import { Routes } from '@angular/router';
import { JoinRoom } from './room/join-room/join-room';
import { RoomClient } from './room/room-client/room-client';

export const routes: Routes = [
  {
    path: '',
    component: JoinRoom,
    title: 'Spark: Join Room',
  },
  {
    path: 'room/:roomSlug',
    component: RoomClient,
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
