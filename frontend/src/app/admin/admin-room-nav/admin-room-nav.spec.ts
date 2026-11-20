import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminRoomNav } from './admin-room-nav';

describe('AdminRoomNav', () => {
  let component: AdminRoomNav;
  let fixture: ComponentFixture<AdminRoomNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRoomNav],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRoomNav);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
