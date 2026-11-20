import { TestBed } from '@angular/core/testing';
import { PresentationService } from './presentation-service';

describe('PresentationService', () => {
  let service: PresentationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PresentationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should keep a presentation without a split as a single slide', () => {
    expect(service.parsePresentation('# Slide 1\n\nContent')).toEqual(['# Slide 1\n\nContent']);
  });

  it('should split a presentation at a slide separator', () => {
    expect(service.parsePresentation('# Slide 1\n\nContent\n\n------\n\n# Slide 2')).toEqual([
      '# Slide 1\n\nContent',
      '# Slide 2',
    ]);
  });

  it('should ignore empty slides', () => {
    expect(service.parsePresentation('------\n# Slide\n------')).toEqual(['# Slide']);
  });
});
