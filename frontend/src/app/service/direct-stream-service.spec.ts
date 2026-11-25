import { TestBed } from '@angular/core/testing';
import { DirectStreamService } from './direct-stream-service';

describe('DirectStreamService', () => {
  let service: DirectStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DirectStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
