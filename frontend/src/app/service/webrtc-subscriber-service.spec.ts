import { TestBed } from '@angular/core/testing';
import { WebrtcSubscriberService } from './webrtc-subscriber-service';

describe('WebrtcSubscriberService', () => {
  let service: WebrtcSubscriberService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebrtcSubscriberService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
