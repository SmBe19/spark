import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomAdminStream } from './room-admin-stream';

describe('RoomAdminStream', () => {
  let component: RoomAdminStream;
  let fixture: ComponentFixture<RoomAdminStream>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomAdminStream],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomAdminStream);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
