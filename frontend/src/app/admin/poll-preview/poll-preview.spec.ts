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
    fixture.componentRef.setInput('parsedPoll', {
      questions: [],
      presentationPages: [],
      clientPages: [],
    });
    fixture.componentRef.setInput('activeQuestionIndex', 0);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
