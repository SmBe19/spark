import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomAdmin } from './room-admin';

describe('RoomAdmin', () => {
  let component: RoomAdmin;
  let fixture: ComponentFixture<RoomAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomAdmin],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
