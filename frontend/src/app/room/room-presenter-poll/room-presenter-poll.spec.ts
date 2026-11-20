import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomPresenterPoll } from './room-presenter-poll';

describe('RoomPresenterPoll', () => {
  let component: RoomPresenterPoll;
  let fixture: ComponentFixture<RoomPresenterPoll>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomPresenterPoll],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomPresenterPoll);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
