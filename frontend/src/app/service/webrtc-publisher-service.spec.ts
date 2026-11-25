import { TestBed } from '@angular/core/testing';
import { WebrtcPublisherService } from './webrtc-publisher-service';

describe('WebrtcPublisherService', () => {
  let service: WebrtcPublisherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebrtcPublisherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
