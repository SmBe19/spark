import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomClientPoll } from './room-client-poll';

describe('RoomClientPoll', () => {
  let component: RoomClientPoll;
  let fixture: ComponentFixture<RoomClientPoll>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomClientPoll],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomClientPoll);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
