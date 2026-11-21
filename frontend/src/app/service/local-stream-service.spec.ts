import { TestBed } from '@angular/core/testing';
import { LocalStreamService } from './local-stream-service';

describe('LocalStreamService', () => {
  let service: LocalStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
