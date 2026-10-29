import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresentationPreview } from './presentation-preview';

describe('PresentationPreview', () => {
  let component: PresentationPreview;
  let fixture: ComponentFixture<PresentationPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
