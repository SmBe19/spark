import { TestBed } from '@angular/core/testing';
import { PresentationNavigationService } from './presentation-navigation-service';

describe('PresentationNavigationService', () => {
  let service: PresentationNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PresentationNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
