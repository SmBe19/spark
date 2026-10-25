import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomPresentation } from './room-presentation';

describe('RoomPresentation', () => {
  let component: RoomPresentation;
  let fixture: ComponentFixture<RoomPresentation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomPresentation],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomPresentation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
