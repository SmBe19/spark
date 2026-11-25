import { TestBed } from '@angular/core/testing';
import { SfuSignallingService } from './sfu-signalling-service';

describe('SfuSignallingService', () => {
  let service: SfuSignallingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SfuSignallingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
