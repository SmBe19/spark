import { TestBed } from '@angular/core/testing';
import { RoomInfoService } from './room-info-service';
import { RoomService } from './room-service';
import { RoomClientService } from './room-client-service';
import { RoomInfo } from '../model/rooms';

describe('RoomInfoService', () => {
  let service: RoomInfoService;
  let roomService: RoomService;
  let roomClientService: RoomClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoomInfoService);
    roomService = TestBed.inject(RoomService);
    roomClientService = TestBed.inject(RoomClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('is only the presenter when the admin room is joined without a client room', () => {
    expect(service.isPresenter()).toBe(false);

    roomService.activeRoom.set({ id: 'presenter-room' } as RoomInfo);
    expect(service.isPresenter()).toBe(true);

    roomClientService.activeRoom.set({ id: 'client-room' } as RoomInfo);
    expect(service.isPresenter()).toBe(false);
  });
});
