import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomAdminPoll } from './room-admin-poll';

describe('RoomAdminPoll', () => {
  let component: RoomAdminPoll;
  let fixture: ComponentFixture<RoomAdminPoll>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomAdminPoll],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomAdminPoll);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
