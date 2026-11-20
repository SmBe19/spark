import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomAdminTimer } from './room-admin-timer';

describe('RoomAdminTimer', () => {
  let component: RoomAdminTimer;
  let fixture: ComponentFixture<RoomAdminTimer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomAdminTimer],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomAdminTimer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
