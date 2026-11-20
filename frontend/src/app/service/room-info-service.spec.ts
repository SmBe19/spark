import { TestBed } from '@angular/core/testing';
import { RoomInfoService } from './room-info-service';

describe('RoomInfoService', () => {
  let service: RoomInfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoomInfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
