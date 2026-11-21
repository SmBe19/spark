import { TestBed } from '@angular/core/testing';
import { PollNavigationService } from './poll-navigation-service';

describe('PollNavigationService', () => {
  let service: PollNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PollNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
