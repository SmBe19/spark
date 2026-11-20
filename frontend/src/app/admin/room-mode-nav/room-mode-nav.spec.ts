import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomModeNav } from './room-mode-nav';

describe('RoomModeNav', () => {
  let component: RoomModeNav;
  let fixture: ComponentFixture<RoomModeNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomModeNav],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomModeNav);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
