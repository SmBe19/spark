import { TestBed } from '@angular/core/testing';
import { RoomClientService } from './room-client-service';

describe('RoomClientService', () => {
  let service: RoomClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoomClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
