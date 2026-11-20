import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomAdminArchive } from './room-admin-archive';

describe('RoomAdminArchive', () => {
  let component: RoomAdminArchive;
  let fixture: ComponentFixture<RoomAdminArchive>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomAdminArchive],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomAdminArchive);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
