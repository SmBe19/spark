import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomFullscreenTimer } from './room-fullscreen-timer';

describe('RoomFullscreenTimer', () => {
  let component: RoomFullscreenTimer;
  let fixture: ComponentFixture<RoomFullscreenTimer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomFullscreenTimer],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomFullscreenTimer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
