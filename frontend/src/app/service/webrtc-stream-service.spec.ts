import { TestBed } from '@angular/core/testing';
import { WebrtcStreamService } from './webrtc-stream-service';

describe('WebrtcStreamService', () => {
  let service: WebrtcStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebrtcStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
