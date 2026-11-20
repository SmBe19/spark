import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomSmallTimer } from './room-small-timer';

describe('RoomSmallTimer', () => {
  let component: RoomSmallTimer;
  let fixture: ComponentFixture<RoomSmallTimer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomSmallTimer],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomSmallTimer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
