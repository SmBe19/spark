import { Routes } from '@angular/router';
import { JoinRoom } from './room/join-room/join-room';
import { AdminWrapper } from './admin/admin-wrapper/admin-wrapper';
import { RoomClient } from './room/room-client/room-client';
import { RoomPresentation } from './room/room-presentation/room-presentation';

export const routes: Routes = [
  {
    path: '',
    component: JoinRoom,
    title: 'Spark: Join Room',
  },
  {
    path: 'room/:roomId',
    component: RoomClient,
    title: 'Spark',
  },
  {
    path: 'presentation/:roomId',
    component: RoomPresentation,
    title: 'Spark',
  },
  {
    path: 'admin',
    component: AdminWrapper,
    title: 'Spark: Admin',
  },
];
