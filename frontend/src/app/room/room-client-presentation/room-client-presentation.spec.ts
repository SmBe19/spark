import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomClientPresentation } from './room-client-presentation';

describe('RoomClientPresentation', () => {
  let component: RoomClientPresentation;
  let fixture: ComponentFixture<RoomClientPresentation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomClientPresentation],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomClientPresentation);
    fixture.componentRef.setInput('roomName', '');
    fixture.componentRef.setInput('activeSlide', undefined);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
