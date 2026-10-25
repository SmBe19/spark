import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PollPreview } from './poll-preview';

describe('PollPreview', () => {
  let component: PollPreview;
  let fixture: ComponentFixture<PollPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PollPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(PollPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
