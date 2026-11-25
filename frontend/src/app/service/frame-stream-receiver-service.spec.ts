import { TestBed } from '@angular/core/testing';
import { FrameStreamReceiverService } from './frame-stream-receiver-service';

describe('FrameStreamReceiverService', () => {
  let service: FrameStreamReceiverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FrameStreamReceiverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
