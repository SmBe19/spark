import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomPresenterPresentation } from './room-presenter-presentation';

describe('RoomPresenterPresentation', () => {
  let component: RoomPresenterPresentation;
  let fixture: ComponentFixture<RoomPresenterPresentation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomPresenterPresentation],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomPresenterPresentation);
    fixture.componentRef.setInput('activeSlide', '');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
