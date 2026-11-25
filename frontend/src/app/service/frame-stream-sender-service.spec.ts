import { TestBed } from '@angular/core/testing';
import { FrameStreamSenderService } from './frame-stream-sender-service';

describe('FrameStreamSenderService', () => {
  let service: FrameStreamSenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FrameStreamSenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
