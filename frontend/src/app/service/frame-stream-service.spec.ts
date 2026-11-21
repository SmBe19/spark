import { TestBed } from '@angular/core/testing';
import { FrameStreamService } from './frame-stream-service';

describe('FrameStreamService', () => {
  let service: FrameStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FrameStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
